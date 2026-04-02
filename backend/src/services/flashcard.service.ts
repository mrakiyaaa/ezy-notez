import { supabaseAdmin } from "../config/supabase";
import { spawn } from "child_process";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FlashcardSetStatus = "pending" | "processing" | "ready" | "failed";
export type FlashcardStatus = "unknown" | "known" | "review";

export interface FlashcardSetRow {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  source_ids: string[];
  card_count: number;
  status: FlashcardSetStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlashcardRow {
  id: string;
  set_id: string;
  front: string;
  back: string;
  position: number;
  status: FlashcardStatus;
  created_at: string;
}

export interface FlashcardSetWithCards extends FlashcardSetRow {
  cards: FlashcardRow[];
}

interface ResourceTextRow {
  id: string;
  extracted_text: string | null;
}

interface GeneratedFlashcard {
  front: string;
  back: string;
}

const PYTHON_SCRIPT_PATH = "../../scripts/generate_flashcards.py";
const MIN_CARD_COUNT = 5;
const MAX_CARD_COUNT = 20;
const DEFAULT_CARD_COUNT = 10;

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Spawn the flashcard generation Python script, pass data via stdin,
 * and resolve with parsed JSON array of flashcards.
 * Includes 2-minute timeout for AI model loading.
 */
const spawnFlashcardScript = (
  inputText: string,
  count: number,
  topic?: string
): Promise<GeneratedFlashcard[]> => {
  const scriptPath = path.resolve(__dirname, PYTHON_SCRIPT_PATH);
  const args = [scriptPath, String(count)];
  if (topic) {
    args.push(topic);
  }

  console.log(`[spawnFlashcardScript] Spawning: python ${args.join(" ")}`);
  console.log(`[spawnFlashcardScript] Input text length: ${inputText.length} chars`);

  return new Promise((resolve, reject) => {
    const proc = spawn("python", args);
    let stdout = "";
    let stderr = "";
    let hasCompleted = false;

    // 30-second timeout (extractive NLP is fast, ~1-2s)
    const timeout = setTimeout(() => {
      if (!hasCompleted) {
        hasCompleted = true;
        proc.kill();
        reject(new Error("Flashcard generation timed out after 30 seconds."));
      }
    }, 30000);

    proc.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      console.log(`[spawnFlashcardScript] stdout: ${text.substring(0, 200)}`);
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      console.log(`[spawnFlashcardScript] stderr: ${text}`);
    });

    proc.on("close", (exitCode) => {
      if (hasCompleted) return;
      hasCompleted = true;
      clearTimeout(timeout);

      console.log(`[spawnFlashcardScript] Process exited with code ${exitCode}`);
      console.log(`[spawnFlashcardScript] stderr length: ${stderr.length}`);
      console.log(`[spawnFlashcardScript] stdout length: ${stdout.length}`);

      if (exitCode === 0) {
        try {
          const parsed = JSON.parse(stdout.trim()) as GeneratedFlashcard[];
          if (!Array.isArray(parsed)) {
            reject(new Error("Script output is not a JSON array"));
            return;
          }
          // Validate structure
          for (const card of parsed) {
            if (typeof card.front !== "string" || typeof card.back !== "string") {
              reject(new Error("Invalid flashcard structure in output"));
              return;
            }
          }
          console.log(`[spawnFlashcardScript] Successfully generated ${parsed.length} flashcards`);
          resolve(parsed);
        } catch (parseError) {
          console.error(`[spawnFlashcardScript] Parse error:`, parseError);
          reject(new Error(`Failed to parse script output: ${parseError}`));
        }
      } else {
        console.error(`[spawnFlashcardScript] Script failed:`, stderr.trim());
        reject(
          new Error(
            `Flashcard generation script exited with code ${exitCode}: ${stderr.trim() || "No error message"}`
          )
        );
      }
    });

    proc.on("error", (spawnError) => {
      if (hasCompleted) return;
      hasCompleted = true;
      clearTimeout(timeout);
      console.error(`[spawnFlashcardScript] Spawn error:`, spawnError);
      reject(
        new Error(
          `Failed to spawn flashcard generation script: ${spawnError.message}`
        )
      );
    });

    proc.stdin.on("error", (writeError) => {
      console.error(`[spawnFlashcardScript] stdin error:`, writeError);
    });

    proc.stdin.write(inputText);
    proc.stdin.end();
  });
};

/**
 * Filter resources that have non-empty extracted text.
 */
const filterUsableResources = (
  resources: ResourceTextRow[]
): ResourceTextRow[] =>
  resources.filter(
    (resource) =>
      resource.extracted_text && resource.extracted_text.trim().length > 0
  );

/**
 * Concatenate extracted text from multiple resources.
 */
const combineExtractedText = (resources: ResourceTextRow[]): string =>
  resources
    .map((resource) => resource.extracted_text!.trim())
    .join("\n\n");

/**
 * Run the flashcard generation pipeline for a set:
 *   1. Mark status as 'processing'
 *   2. Spawn the Python flashcard generation script
 *   3. Insert generated flashcards
 *   4. Mark set as 'ready'
 *   5. On error, mark 'failed' with error_message
 */
const runFlashcardPipeline = async (
  setId: string,
  inputText: string,
  count: number,
  topic?: string
): Promise<void> => {
  await supabaseAdmin
    .from("flashcard_sets")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", setId);

  try {
    const generatedCards = await spawnFlashcardScript(inputText, count, topic);

    if (generatedCards.length === 0) {
      throw new Error("No flashcards were generated");
    }

    // Insert flashcards
    const flashcardsToInsert = generatedCards.map((card, index) => ({
      set_id: setId,
      front: card.front.replace(/\0/g, ""), // Strip null bytes
      back: card.back.replace(/\0/g, ""),
      position: index,
      status: "unknown" as FlashcardStatus,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("flashcards")
      .insert(flashcardsToInsert);

    if (insertError) {
      throw new Error(`Failed to save flashcards: ${insertError.message}`);
    }

    // Mark set as ready
    const { error: updateError } = await supabaseAdmin
      .from("flashcard_sets")
      .update({
        status: "ready",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", setId);

    if (updateError) {
      throw new Error(`Failed to update set status: ${updateError.message}`);
    }
  } catch (pipelineError) {
    console.error(
      `[runFlashcardPipeline] Failed for set=${setId}:`,
      pipelineError
    );

    const { error: statusUpdateError } = await supabaseAdmin
      .from("flashcard_sets")
      .update({
        status: "failed",
        error_message:
          pipelineError instanceof Error
            ? pipelineError.message
            : "Unknown flashcard generation error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", setId);

    if (statusUpdateError) {
      console.error(
        `[runFlashcardPipeline] Failed to mark set=${setId} as failed:`,
        statusUpdateError
      );
    }
  }
};

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Get all flashcard sets for a workspace (without cards).
 */
export const getWorkspaceFlashcardSets = async (
  workspaceId: string
): Promise<FlashcardSetRow[]> => {
  const { data, error } = await supabaseAdmin
    .from("flashcard_sets")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to fetch flashcard sets for workspace ${workspaceId}: ${error.message}`
    );
  }
  return (data ?? []) as FlashcardSetRow[];
};

/**
 * Get a single flashcard set with all its cards.
 */
export const getFlashcardSetById = async (
  id: string
): Promise<FlashcardSetWithCards | null> => {
  const { data: setData, error: setError } = await supabaseAdmin
    .from("flashcard_sets")
    .select("*")
    .eq("id", id)
    .single();

  if (setError) return null;

  const { data: cardsData, error: cardsError } = await supabaseAdmin
    .from("flashcards")
    .select("*")
    .eq("set_id", id)
    .order("position", { ascending: true });

  if (cardsError) {
    throw new Error(`Failed to fetch cards for set ${id}: ${cardsError.message}`);
  }

  return {
    ...(setData as FlashcardSetRow),
    cards: (cardsData ?? []) as FlashcardRow[],
  };
};

/**
 * Delete a flashcard set (cards cascade automatically).
 */
export const deleteFlashcardSet = async (id: string): Promise<void> => {
  const { error } = await supabaseAdmin
    .from("flashcard_sets")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete flashcard set ${id}: ${error.message}`);
  }
};

/**
 * Update a single flashcard's status (known/review/unknown).
 */
export const updateFlashcardStatus = async (
  cardId: string,
  status: FlashcardStatus
): Promise<void> => {
  const { error } = await supabaseAdmin
    .from("flashcards")
    .update({ status })
    .eq("id", cardId);

  if (error) {
    throw new Error(`Failed to update flashcard status: ${error.message}`);
  }
};

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/**
 * Generate flashcards for selected resources.
 * Creates a pending set, then fires the generation pipeline in background.
 * Returns the pending set row immediately.
 */
export const generateFlashcards = async (
  workspaceId: string,
  userId: string,
  resourceIds: string[],
  topic?: string,
  cardCount?: number
): Promise<FlashcardSetRow> => {
  // Clamp card count
  const count = Math.max(
    MIN_CARD_COUNT,
    Math.min(MAX_CARD_COUNT, cardCount ?? DEFAULT_CARD_COUNT)
  );

  // Fetch resources
  const { data: fetchedResources, error: fetchError } = await supabaseAdmin
    .from("resources")
    .select("id, extracted_text")
    .eq("workspace_id", workspaceId)
    .eq("status", "ready")
    .in("id", resourceIds)
    .not("extracted_text", "is", null);

  if (fetchError) {
    throw new Error(
      `Failed to fetch resources for workspace ${workspaceId}: ${fetchError.message}`
    );
  }

  const usableResources = filterUsableResources(
    (fetchedResources ?? []) as ResourceTextRow[]
  );

  if (usableResources.length === 0) {
    throw new Error("None of the selected resources have extracted text");
  }

  const sourceIds = usableResources.map((r) => r.id);
  const combinedText = combineExtractedText(usableResources);

  // Generate title
  const title = topic?.trim()
    ? `${topic.trim()} Flashcards`
    : "Generated Flashcards";

  // Insert pending set
  const { data: insertedSet, error: insertError } = await supabaseAdmin
    .from("flashcard_sets")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      title,
      source_ids: sourceIds,
      card_count: count,
      status: "pending",
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to create flashcard set: ${insertError.message}`);
  }

  // Fire generation pipeline in background
  runFlashcardPipeline(insertedSet.id, combinedText, count, topic?.trim()).catch(
    (pipelineError) => {
      console.error(
        "[generateFlashcards] Background pipeline failed:",
        pipelineError
      );
    }
  );

  return insertedSet as FlashcardSetRow;
};

/**
 * Regenerate flashcards for an existing set.
 * Deletes existing cards, resets status, and re-runs the pipeline.
 */
export const regenerateFlashcardSet = async (
  id: string,
  newTopic?: string,
  newCardCount?: number
): Promise<FlashcardSetRow> => {
  const existing = await getFlashcardSetById(id);
  if (!existing) throw new Error(`Flashcard set ${id} not found`);

  const topic = newTopic ?? existing.title.replace(/ Flashcards$/, "");
  const count = newCardCount ?? existing.card_count;

  // Fetch source resources
  const { data: sourceResources, error: fetchError } = await supabaseAdmin
    .from("resources")
    .select("id, extracted_text")
    .in("id", existing.source_ids)
    .not("extracted_text", "is", null);

  if (fetchError) {
    throw new Error(`Failed to fetch source resources: ${fetchError.message}`);
  }

  const usableResources = filterUsableResources(
    (sourceResources ?? []) as ResourceTextRow[]
  );

  if (usableResources.length === 0) {
    throw new Error("Source resources no longer have extracted text");
  }

  const combinedText = combineExtractedText(usableResources);

  // Delete existing cards
  await supabaseAdmin.from("flashcards").delete().eq("set_id", id);

  // Reset set status
  const { data: updatedSet, error: updateError } = await supabaseAdmin
    .from("flashcard_sets")
    .update({
      status: "pending",
      title: topic ? `${topic} Flashcards` : existing.title,
      card_count: count,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    throw new Error(
      `Failed to reset flashcard set ${id} for regeneration: ${updateError.message}`
    );
  }

  // Fire regeneration pipeline in background
  runFlashcardPipeline(id, combinedText, count, topic).catch((pipelineError) => {
    console.error(
      `[regenerateFlashcardSet] Background pipeline failed for set=${id}:`,
      pipelineError
    );
  });

  return updatedSet as FlashcardSetRow;
};
