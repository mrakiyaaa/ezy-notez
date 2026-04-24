import { supabaseAdmin } from "../config/supabase";
import axios from "axios";

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PYTHON_ML_URL = process.env.PYTHON_ML_URL || "http://localhost:8000";
const FLASHCARD_ML_BASE_URL = `${PYTHON_ML_URL.replace(/\/+$/, "")}/flashcards`;
const ML_TIMEOUT_MS = 30_000;
const MIN_CARD_COUNT = 5;
const MAX_CARD_COUNT = 20;
const DEFAULT_CARD_COUNT = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clampCardCount = (n?: number): number =>
  Math.max(MIN_CARD_COUNT, Math.min(MAX_CARD_COUNT, n ?? DEFAULT_CARD_COUNT));

const nowISO = (): string => new Date().toISOString();

const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : "Unknown error";

const callFlashcardMLService = async (
  inputText: string,
  count: number,
  topic?: string,
): Promise<GeneratedFlashcard[]> => {
  try {
    const response = await axios.post<{ flashcards: GeneratedFlashcard[] }>(
      `${FLASHCARD_ML_BASE_URL}/generate`,
      { text: inputText, count, topic },
      { timeout: ML_TIMEOUT_MS },
    );
    const cards = response.data.flashcards;
    if (!Array.isArray(cards) || cards.length === 0) {
      throw new Error("ML service returned an empty or non-array result");
    }
    return cards;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        const msg = `Flashcard generation timed out after ${ML_TIMEOUT_MS / 1000}s — the service may be under load.`;
        console.error("[flashcard] ML service timeout:", msg);
        throw new Error(msg);
      }
      if (err.response) {
        const detail = err.response.data?.detail;
        const mlMessage =
          typeof detail === "object" && detail !== null
            ? ((detail as Record<string, unknown>).message ?? JSON.stringify(detail))
            : typeof detail === "string"
              ? detail
              : JSON.stringify(err.response.data);
        const msg = `ML service returned ${err.response.status}: ${mlMessage}`;
        console.error("[flashcard] ML service error:", msg);
        throw new Error(msg);
      }
      const msg = `Cannot reach ML service at ${FLASHCARD_ML_BASE_URL} — ${err.message}`;
      console.error("[flashcard] ML service unreachable:", msg);
      throw new Error(msg);
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
};

const getUsableResources = (rows: ResourceTextRow[]): ResourceTextRow[] =>
  rows.filter((r) => r.extracted_text && r.extracted_text.trim().length > 0);

const combineText = (rows: ResourceTextRow[]): string =>
  rows.map((r) => r.extracted_text!.trim()).join("\n\n");

// ---------------------------------------------------------------------------
// Pipeline (runs in background)
// ---------------------------------------------------------------------------

const updateSetStatus = async (
  setId: string,
  status: FlashcardSetStatus,
  errorMsg?: string,
) => {
  const { error } = await supabaseAdmin
    .from("flashcard_sets")
    .update({
      status,
      error_message: errorMsg ?? null,
      updated_at: nowISO(),
    })
    .eq("id", setId);

  if (error) {
    console.error(`[flashcard] Failed to set status=${status} for set=${setId}:`, error.message);
  }
};

const runPipeline = async (
  setId: string,
  text: string,
  count: number,
  topic?: string,
): Promise<void> => {
  await updateSetStatus(setId, "processing");

  try {
    const cards = await callFlashcardMLService(text, count, topic);

    const rows = cards.map((card, i) => ({
      set_id: setId,
      front: card.front.replace(/\0/g, ""),
      back: card.back.replace(/\0/g, ""),
      position: i,
      status: "unknown" as FlashcardStatus,
    }));

    const { error: insertErr } = await supabaseAdmin
      .from("flashcards")
      .insert(rows);

    if (insertErr) {
      throw new Error(`Database insert failed: ${insertErr.message}`);
    }

    await updateSetStatus(setId, "ready");
  } catch (err) {
    console.error(`[flashcard] Pipeline failed for set=${setId}:`, errorMessage(err));
    await updateSetStatus(setId, "failed", errorMessage(err));
  }
};

// ---------------------------------------------------------------------------
// Fetch helpers (shared by generate + regenerate)
// ---------------------------------------------------------------------------

const fetchResourceText = async (
  filter: { workspaceId?: string; resourceIds: string[] },
): Promise<string> => {
  let query = supabaseAdmin
    .from("resources")
    .select("id, extracted_text")
    .in("id", filter.resourceIds)
    .not("extracted_text", "is", null);

  if (filter.workspaceId) {
    query = query.eq("workspace_id", filter.workspaceId).eq("status", "ready");
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch resources: ${error.message}`);
  }

  const usable = getUsableResources((data ?? []) as ResourceTextRow[]);
  if (usable.length === 0) {
    throw new Error("None of the selected resources have extracted text");
  }

  return combineText(usable);
};

const fetchUsableSourceIds = async (
  workspaceId: string,
  resourceIds: string[],
): Promise<string[]> => {
  const { data, error } = await supabaseAdmin
    .from("resources")
    .select("id, extracted_text")
    .eq("workspace_id", workspaceId)
    .eq("status", "ready")
    .in("id", resourceIds)
    .not("extracted_text", "is", null);

  if (error) {
    throw new Error(`Failed to fetch resources: ${error.message}`);
  }

  return getUsableResources((data ?? []) as ResourceTextRow[]).map((r) => r.id);
};

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export const getWorkspaceFlashcardSets = async (
  workspaceId: string,
): Promise<FlashcardSetRow[]> => {
  const { data, error } = await supabaseAdmin
    .from("flashcard_sets")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch flashcard sets: ${error.message}`);
  return (data ?? []) as FlashcardSetRow[];
};

export const getFlashcardSetById = async (
  id: string,
): Promise<FlashcardSetWithCards | null> => {
  const { data: setData, error: setErr } = await supabaseAdmin
    .from("flashcard_sets")
    .select("*")
    .eq("id", id)
    .single();

  if (setErr) return null;

  const { data: cardsData, error: cardsErr } = await supabaseAdmin
    .from("flashcards")
    .select("*")
    .eq("set_id", id)
    .order("position", { ascending: true });

  if (cardsErr) throw new Error(`Failed to fetch cards: ${cardsErr.message}`);

  return {
    ...(setData as FlashcardSetRow),
    cards: (cardsData ?? []) as FlashcardRow[],
  };
};

export const deleteFlashcardSet = async (id: string): Promise<void> => {
  const { error } = await supabaseAdmin
    .from("flashcard_sets")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Failed to delete flashcard set: ${error.message}`);
};

export const updateFlashcardStatus = async (
  cardId: string,
  status: FlashcardStatus,
): Promise<void> => {
  const { error } = await supabaseAdmin
    .from("flashcards")
    .update({ status })
    .eq("id", cardId);

  if (error) throw new Error(`Failed to update flashcard status: ${error.message}`);
};

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export const generateFlashcards = async (
  workspaceId: string,
  userId: string,
  resourceIds: string[],
  topic?: string,
  cardCount?: number,
): Promise<FlashcardSetRow> => {
  const count = clampCardCount(cardCount);

  // Validate resources upfront
  const sourceIds = await fetchUsableSourceIds(workspaceId, resourceIds);
  if (sourceIds.length === 0) {
    throw new Error("None of the selected resources have extracted text");
  }

  const combinedText = await fetchResourceText({
    workspaceId,
    resourceIds: sourceIds,
  });

  const title = topic?.trim() ? `${topic.trim()} Flashcards` : "Generated Flashcards";

  const { data: set, error } = await supabaseAdmin
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

  if (error) throw new Error(`Failed to create flashcard set: ${error.message}`);

  // Fire-and-forget pipeline
  runPipeline(set.id, combinedText, count, topic?.trim()).catch((err) => {
    console.error("[flashcard] Background pipeline error:", errorMessage(err));
  });

  return set as FlashcardSetRow;
};

export const regenerateFlashcardSet = async (
  id: string,
  newTopic?: string,
  newCardCount?: number,
): Promise<FlashcardSetRow> => {
  const existing = await getFlashcardSetById(id);
  if (!existing) throw new Error(`Flashcard set ${id} not found`);

  const topic = newTopic ?? existing.title.replace(/ Flashcards$/, "");
  const count = clampCardCount(newCardCount ?? existing.card_count);

  const combinedText = await fetchResourceText({
    resourceIds: existing.source_ids,
  });

  // Clear old cards
  const { error: delErr } = await supabaseAdmin
    .from("flashcards")
    .delete()
    .eq("set_id", id);
  if (delErr) throw new Error(`Failed to delete old cards: ${delErr.message}`);

  // Reset set
  const { data: updated, error: updErr } = await supabaseAdmin
    .from("flashcard_sets")
    .update({
      status: "pending",
      title: topic ? `${topic} Flashcards` : existing.title,
      card_count: count,
      error_message: null,
      updated_at: nowISO(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updErr) throw new Error(`Failed to reset flashcard set: ${updErr.message}`);

  runPipeline(id, combinedText, count, topic).catch((err) => {
    console.error(`[flashcard] Regeneration pipeline error for set=${id}:`, errorMessage(err));
  });

  return updated as FlashcardSetRow;
};
