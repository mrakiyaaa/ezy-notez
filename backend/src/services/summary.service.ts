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

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(
          new Error(`Script exited with code ${code}: ${stderr.trim()}`)
        );
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn script: ${err.message}`));
    });

    // Pipe the input text via stdin
    proc.stdin.write(stdinData);
    proc.stdin.end();
  });
};

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
  // Mark processing
  await supabaseAdmin
    .from("summaries")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", summaryId);

  try {
    const rawOutput = await spawnPythonScriptWithStdin(
      "../../scripts/summarize_text.py",
      [format, "1024"],
      inputText
    );

    // Strip null bytes (rejected by PostgreSQL text type)
    const content = rawOutput.replace(/\0/g, "");

    const { error } = await supabaseAdmin
      .from("summaries")
      .update({
        content,
        status: "ready",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", summaryId);

    if (error) throw new Error(`Supabase update failed: ${error.message}`);
  } catch (err) {
    console.error(`[runSummarizationPipeline] summary=${summaryId}`, err);

    await supabaseAdmin
      .from("summaries")
      .update({
        status: "failed",
        error_message:
          err instanceof Error ? err.message : "Unknown error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", summaryId)
      .then(({ error: e }) => {
        if (e)
          console.error(
            `[runSummarizationPipeline] failed to set status=failed:`,
            e
          );
      });
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

  if (error) throw new Error(`Failed to fetch summaries: ${error.message}`);
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

  if (error) throw new Error(`Failed to delete summary: ${error.message}`);
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
  // Fetch all ready resources with non-empty extracted_text
  const { data: resources, error: fetchErr } = await supabaseAdmin
    .from("resources")
    .select("id, extracted_text")
    .eq("workspace_id", workspaceId)
    .eq("status", "ready")
    .not("extracted_text", "is", null);

  if (fetchErr)
    throw new Error(`Failed to fetch resources: ${fetchErr.message}`);

  const usable = (resources ?? []).filter(
    (r: { id: string; extracted_text: string | null }) =>
      r.extracted_text && r.extracted_text.trim().length > 0
  );

  if (usable.length === 0) {
    throw new Error("No resources with extracted text found in this workspace");
  }

  const sourceIds = usable.map((r: { id: string }) => r.id);
  const combinedText = usable
    .map((r: { extracted_text: string | null }) => r.extracted_text!.trim())
    .join("\n\n");

  // Insert pending summary row
  const { data: summary, error: insertErr } = await supabaseAdmin
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

  if (insertErr)
    throw new Error(`Failed to create summary: ${insertErr.message}`);

  // Fire-and-forget the pipeline
  runSummarizationPipeline(summary.id, combinedText, format).catch((err) => {
    console.error("[generateGeneralSummary] pipeline failed:", err);
  });

  return summary as SummaryRow;
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
  // Fetch requested resources with their extracted text
  const { data: resources, error: fetchErr } = await supabaseAdmin
    .from("resources")
    .select("id, extracted_text")
    .eq("workspace_id", workspaceId)
    .eq("status", "ready")
    .in("id", resourceIds)
    .not("extracted_text", "is", null);

  if (fetchErr)
    throw new Error(`Failed to fetch resources: ${fetchErr.message}`);

  const usable = (resources ?? []).filter(
    (r: { id: string; extracted_text: string | null }) =>
      r.extracted_text && r.extracted_text.trim().length > 0
  );

  if (usable.length === 0) {
    throw new Error("None of the selected resources have extracted text");
  }

  const summaries: SummaryRow[] = [];

  for (const resource of usable) {
    const { data: summary, error: insertErr } = await supabaseAdmin
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

    if (insertErr)
      throw new Error(`Failed to create summary: ${insertErr.message}`);

    summaries.push(summary as SummaryRow);

    // Fire-and-forget the pipeline for each resource
    runSummarizationPipeline(
      summary.id,
      resource.extracted_text!.trim(),
      format
    ).catch((err) => {
      console.error(
        `[generateResourceSummaries] pipeline failed for resource=${resource.id}:`,
        err
      );
    });
  }

  return summaries;
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
  if (!existing) throw new Error("Summary not found");

  const format = newFormat ?? existing.format;

  // Determine input text
  let inputText: string;

  if (existing.resource_id) {
    // Per-resource summary — fetch that resource's text
    const { data: resource, error } = await supabaseAdmin
      .from("resources")
      .select("extracted_text")
      .eq("id", existing.resource_id)
      .single();

    if (error || !resource?.extracted_text) {
      throw new Error("Source resource text is no longer available");
    }
    inputText = resource.extracted_text.trim();
  } else {
    // General summary — re-fetch all source resources
    const { data: resources, error } = await supabaseAdmin
      .from("resources")
      .select("id, extracted_text")
      .in("id", existing.source_ids)
      .not("extracted_text", "is", null);

    if (error)
      throw new Error(`Failed to fetch source resources: ${error.message}`);

    const usable = (resources ?? []).filter(
      (r: { id: string; extracted_text: string | null }) =>
        r.extracted_text && r.extracted_text.trim().length > 0
    );

    if (usable.length === 0) {
      throw new Error("Source resources no longer have extracted text");
    }

    inputText = usable
      .map((r: { extracted_text: string | null }) => r.extracted_text!.trim())
      .join("\n\n");
  }

  // Reset to pending
  const { data: updated, error: updateErr } = await supabaseAdmin
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

  if (updateErr)
    throw new Error(`Failed to update summary: ${updateErr.message}`);

  // Fire-and-forget
  runSummarizationPipeline(id, inputText, format).catch((err) => {
    console.error(`[regenerateSummary] pipeline failed for summary=${id}:`, err);
  });

  return updated as SummaryRow;
};
