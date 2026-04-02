import { supabaseAdmin } from "../config/supabase";
import { spawn } from "child_process";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SummaryFormat = "bullet" | "short" | "detailed";
export type SummaryStatus = "pending" | "processing" | "ready" | "failed";

export interface SummaryRow {
  id: string;
  workspace_id: string;
  resource_id: string | null;
  user_id: string;
  format: SummaryFormat;
  content: string;
  source_ids: string[];
  status: SummaryStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface ResourceTextRow {
  id: string;
  extracted_text: string | null;
}

const PYTHON_SCRIPT_PATH = "../../scripts/summarize_text.py";
const DEFAULT_CHUNK_SIZE = "1024";

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Spawn a Python script, pass data via stdin, and resolve with stdout.
 * Rejects if the process exits non-zero or fails to start.
 */
const spawnPythonScriptWithStdin = (
  scriptRelPath: string,
  args: string[],
  stdinData: string
): Promise<string> => {
  const scriptPath = path.resolve(__dirname, scriptRelPath);

  return new Promise((resolve, reject) => {
    const proc = spawn("python", [scriptPath, ...args]);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve(stdout.trim());
      } else {
        reject(
          new Error(
            `Summarization script exited with code ${exitCode}: ${stderr.trim()}`
          )
        );
      }
    });

    proc.on("error", (spawnError) => {
      reject(
        new Error(
          `Failed to spawn summarization script: ${spawnError.message}`
        )
      );
    });

    proc.stdin.on("error", (writeError) => {
      reject(
        new Error(
          `Failed to write input to summarization script: ${writeError.message}`
        )
      );
    });

    proc.stdin.write(stdinData);
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
 * Run the summarization pipeline for a single summary row:
 *   1. Mark status as 'processing'
 *   2. Spawn the Python summarization script
 *   3. Sanitize and store the result, mark 'ready'
 *   4. On error, mark 'failed' with error_message
 */
const runSummarizationPipeline = async (
  summaryId: string,
  inputText: string,
  format: SummaryFormat
): Promise<void> => {
  await supabaseAdmin
    .from("summaries")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", summaryId);

  try {
    const rawOutput = await spawnPythonScriptWithStdin(
      PYTHON_SCRIPT_PATH,
      [format, DEFAULT_CHUNK_SIZE],
      inputText
    );

    // Strip null bytes (rejected by PostgreSQL text type)
    const sanitizedContent = rawOutput.replace(/\0/g, "");

    const { error: updateError } = await supabaseAdmin
      .from("summaries")
      .update({
        content: sanitizedContent,
        status: "ready",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", summaryId);

    if (updateError) {
      throw new Error(
        `Failed to save summary result to database: ${updateError.message}`
      );
    }
  } catch (pipelineError) {
    console.error(
      `[runSummarizationPipeline] Failed for summary=${summaryId}:`,
      pipelineError
    );

    const { error: statusUpdateError } = await supabaseAdmin
      .from("summaries")
      .update({
        status: "failed",
        error_message:
          pipelineError instanceof Error
            ? pipelineError.message
            : "Unknown summarization error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", summaryId);

    if (statusUpdateError) {
      console.error(
        `[runSummarizationPipeline] Failed to mark summary=${summaryId} as failed:`,
        statusUpdateError
      );
    }
  }
};

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Get all summaries for a workspace.
 */
export const getWorkspaceSummaries = async (
  workspaceId: string
): Promise<SummaryRow[]> => {
  const { data, error } = await supabaseAdmin
    .from("summaries")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to fetch summaries for workspace ${workspaceId}: ${error.message}`
    );
  }
  return (data ?? []) as SummaryRow[];
};

/**
 * Get a single summary by ID.
 */
export const getSummaryById = async (
  id: string
): Promise<SummaryRow | null> => {
  const { data, error } = await supabaseAdmin
    .from("summaries")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as SummaryRow;
};

/**
 * Delete a summary row.
 */
export const deleteSummary = async (id: string): Promise<void> => {
  const { error } = await supabaseAdmin
    .from("summaries")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete summary ${id}: ${error.message}`);
  }
};

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/**
 * Generate a general (workspace-wide) summary.
 * Fetches all ready resources, concatenates their extracted text, inserts a
 * pending summary row, then fires the pipeline in the background.
 * Returns the pending summary row immediately.
 */
export const generateGeneralSummary = async (
  workspaceId: string,
  userId: string,
  format: SummaryFormat
): Promise<SummaryRow> => {
  const { data: fetchedResources, error: fetchError } = await supabaseAdmin
    .from("resources")
    .select("id, extracted_text")
    .eq("workspace_id", workspaceId)
    .eq("status", "ready")
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
    throw new Error("No resources with extracted text found in this workspace");
  }

  const sourceIds = usableResources.map((resource) => resource.id);
  const combinedText = combineExtractedText(usableResources);

  const { data: insertedSummary, error: insertError } = await supabaseAdmin
    .from("summaries")
    .insert({
      workspace_id: workspaceId,
      resource_id: null,
      user_id: userId,
      format,
      content: "",
      source_ids: sourceIds,
      status: "pending",
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(
      `Failed to create summary record: ${insertError.message}`
    );
  }

  runSummarizationPipeline(insertedSummary.id, combinedText, format).catch(
    (pipelineError) => {
      console.error(
        "[generateGeneralSummary] Background pipeline failed:",
        pipelineError
      );
    }
  );

  return insertedSummary as SummaryRow;
};

/**
 * Generate per-resource summaries (customize mode).
 * For each resource ID, inserts a pending summary row and fires the pipeline.
 * Returns the array of pending summary rows immediately.
 */
export const generateResourceSummaries = async (
  workspaceId: string,
  userId: string,
  format: SummaryFormat,
  resourceIds: string[]
): Promise<SummaryRow[]> => {
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

  const createdSummaries: SummaryRow[] = [];

  for (const resource of usableResources) {
    const { data: insertedSummary, error: insertError } = await supabaseAdmin
      .from("summaries")
      .insert({
        workspace_id: workspaceId,
        resource_id: resource.id,
        user_id: userId,
        format,
        content: "",
        source_ids: [resource.id],
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(
        `Failed to create summary for resource ${resource.id}: ${insertError.message}`
      );
    }

    createdSummaries.push(insertedSummary as SummaryRow);

    runSummarizationPipeline(
      insertedSummary.id,
      resource.extracted_text!.trim(),
      format
    ).catch((pipelineError) => {
      console.error(
        `[generateResourceSummaries] Background pipeline failed for resource=${resource.id}:`,
        pipelineError
      );
    });
  }

  return createdSummaries;
};

/**
 * Re-generate an existing summary. Resets status to pending and re-runs
 * the pipeline. Optionally accepts a new format.
 */
export const regenerateSummary = async (
  id: string,
  newFormat?: SummaryFormat
): Promise<SummaryRow> => {
  const existing = await getSummaryById(id);
  if (!existing) throw new Error(`Summary ${id} not found`);

  const format = newFormat ?? existing.format;

  let inputText: string;

  if (existing.resource_id) {
    const { data: resource, error: fetchError } = await supabaseAdmin
      .from("resources")
      .select("extracted_text")
      .eq("id", existing.resource_id)
      .single();

    if (fetchError || !resource?.extracted_text) {
      throw new Error(
        `Source resource ${existing.resource_id} text is no longer available`
      );
    }
    inputText = resource.extracted_text.trim();
  } else {
    const { data: sourceResources, error: fetchError } = await supabaseAdmin
      .from("resources")
      .select("id, extracted_text")
      .in("id", existing.source_ids)
      .not("extracted_text", "is", null);

    if (fetchError) {
      throw new Error(
        `Failed to fetch source resources: ${fetchError.message}`
      );
    }

    const usableResources = filterUsableResources(
      (sourceResources ?? []) as ResourceTextRow[]
    );

    if (usableResources.length === 0) {
      throw new Error("Source resources no longer have extracted text");
    }

    inputText = combineExtractedText(usableResources);
  }

  const { data: updatedSummary, error: updateError } = await supabaseAdmin
    .from("summaries")
    .update({
      status: "pending",
      format,
      content: "",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    throw new Error(
      `Failed to reset summary ${id} for regeneration: ${updateError.message}`
    );
  }

  runSummarizationPipeline(id, inputText, format).catch((pipelineError) => {
    console.error(
      `[regenerateSummary] Background pipeline failed for summary=${id}:`,
      pipelineError
    );
  });

  return updatedSummary as SummaryRow;
};
