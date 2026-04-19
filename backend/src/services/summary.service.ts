import { supabaseAdmin } from "../config/supabase";
import axios from "axios";

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

// ---------------------------------------------------------------------------
// OpenRouter configuration (reuses the same provider as quiz generation)
// ---------------------------------------------------------------------------

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "meta-llama/llama-3.1-8b-instruct";
const OPENROUTER_HTTP_REFERER = "https://ezynotez.com";
const OPENROUTER_APP_TITLE = "EZY Notez";
const OPENROUTER_TIMEOUT_MS = 60_000;

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

const FORMAT_INSTRUCTIONS: Record<SummaryFormat, string> = {
  bullet:
    "Produce a concise bullet-point list of the key points. " +
    "Use markdown bullet syntax (- item). " +
    "Start with the heading: ## Key Points",
  short:
    "Produce a short single-paragraph overview of the main ideas. " +
    "Start with the heading: ## Summary",
  detailed:
    "Produce a detailed multi-paragraph summary covering all major topics. " +
    "Start with the heading: ## Detailed Summary",
};

const buildSummarizationPrompt = (text: string, format: SummaryFormat): string =>
  `You are an academic content summarizer. Summarize the following academic text clearly and concisely.\n\n` +
  `Instructions: ${FORMAT_INSTRUCTIONS[format]}\n\n` +
  `Return ONLY the formatted summary in markdown. Do not include introductory phrases such as ` +
  `"Here is a summary" or "The following is".\n\n` +
  `TEXT:\n${text}`;

const buildCombinedSummaryPrompt = (
  intermediateSummaries: string[],
  format: SummaryFormat
): string => {
  const sections = intermediateSummaries
    .map((s, i) => `--- Resource ${i + 1} ---\n${s.trim()}`)
    .join("\n\n");

  return (
    `You are an academic content summarizer. Below are summaries of individual resources from an ` +
    `academic workspace. Combine them into a single coherent summary.\n\n` +
    `Instructions: ${FORMAT_INSTRUCTIONS[format]}\n\n` +
    `Return ONLY the formatted combined summary in markdown. Do not include introductory phrases.\n\n` +
    `INDIVIDUAL SUMMARIES:\n${sections}`
  );
};

// ---------------------------------------------------------------------------
// OpenRouter API call
// ---------------------------------------------------------------------------

/**
 * Send a single chat-completion request to OpenRouter and return the model's
 * response text. Throws with the exact error message strings required by the
 * error-handling contract so callers can store them verbatim in error_message.
 */
const callOpenRouterForSummary = async (prompt: string): Promise<string> => {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OpenRouter error: OPENROUTER_API_KEY is not configured on this server."
    );
  }

  try {
    const response = await axios.post<{
      choices: { message: { content: string } }[];
    }>(
      OPENROUTER_API_URL,
      {
        model: OPENROUTER_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": OPENROUTER_HTTP_REFERER,
          "X-Title": OPENROUTER_APP_TITLE,
          "Content-Type": "application/json",
        },
        timeout: OPENROUTER_TIMEOUT_MS,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content || !content.trim()) {
      throw new Error("OpenRouter error: Empty response received from the model.");
    }

    return content.trim();
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        throw new Error(
          "Summarization request timed out. Please try again."
        );
      }
      if (err.response) {
        const detail: string =
          (err.response.data as { error?: { message?: string }; message?: string })
            ?.error?.message ??
          (err.response.data as { message?: string })?.message ??
          err.response.statusText ??
          String(err.response.status);
        throw new Error(`OpenRouter error: ${detail}`);
      }
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
};

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

const filterUsableResources = (
  resources: ResourceTextRow[]
): ResourceTextRow[] =>
  resources.filter(
    (r) => r.extracted_text && r.extracted_text.trim().length > 0
  );

// ---------------------------------------------------------------------------
// Summarization pipelines
// ---------------------------------------------------------------------------

/**
 * Per-resource pipeline: summarize a single text via OpenRouter and persist
 * the result. Used by the customize mode and as a step inside the general
 * pipeline. Updates the DB row through processing → ready/failed.
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
    if (!inputText || !inputText.trim()) {
      throw new Error("No content found for this resource.");
    }

    const prompt = buildSummarizationPrompt(inputText, format);
    const content = await callOpenRouterForSummary(prompt);
    const sanitizedContent = content.replace(/\0/g, "");

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

    const errMsg =
      pipelineError instanceof Error
        ? pipelineError.message
        : "Unknown summarization error";

    const { error: statusUpdateError } = await supabaseAdmin
      .from("summaries")
      .update({
        status: "failed",
        error_message: errMsg,
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

/**
 * General mode pipeline: summarize each resource independently first, then
 * combine the intermediate summaries into one final cohesive summary via a
 * second OpenRouter call. Never concatenates raw resource text.
 */
const runGeneralSummarizationPipeline = async (
  summaryId: string,
  resources: ResourceTextRow[],
  format: SummaryFormat
): Promise<void> => {
  await supabaseAdmin
    .from("summaries")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", summaryId);

  try {
    // Step 1: summarize each resource independently
    const intermediateSummaries: string[] = [];
    for (const resource of resources) {
      const text = (resource.extracted_text ?? "").trim();
      if (!text) continue;

      const prompt = buildSummarizationPrompt(text, format);
      const summary = await callOpenRouterForSummary(prompt);
      intermediateSummaries.push(summary.trim());
    }

    if (intermediateSummaries.length === 0) {
      throw new Error("No content found for this resource.");
    }

    // Step 2: combine into a single final summary (or use the only one directly)
    let finalContent: string;
    if (intermediateSummaries.length === 1) {
      finalContent = intermediateSummaries[0];
    } else {
      const combinedPrompt = buildCombinedSummaryPrompt(intermediateSummaries, format);
      finalContent = await callOpenRouterForSummary(combinedPrompt);
    }

    const sanitizedContent = finalContent.replace(/\0/g, "");

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
      `[runGeneralSummarizationPipeline] Failed for summary=${summaryId}:`,
      pipelineError
    );

    const errMsg =
      pipelineError instanceof Error
        ? pipelineError.message
        : "Unknown summarization error";

    const { error: statusUpdateError } = await supabaseAdmin
      .from("summaries")
      .update({
        status: "failed",
        error_message: errMsg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", summaryId);

    if (statusUpdateError) {
      console.error(
        `[runGeneralSummarizationPipeline] Failed to mark summary=${summaryId} as failed:`,
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
 * Each resource is summarized independently, then the intermediate summaries
 * are combined into one final summary via a second OpenRouter call.
 * Returns the pending summary row immediately; the pipeline runs in the background.
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

  const sourceIds = usableResources.map((r) => r.id);

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

  runGeneralSummarizationPipeline(
    insertedSummary.id,
    usableResources,
    format
  ).catch((pipelineError) => {
    console.error(
      "[generateGeneralSummary] Background pipeline failed:",
      pipelineError
    );
  });

  return insertedSummary as SummaryRow;
};

/**
 * Generate per-resource summaries (customize mode).
 * Each resource is summarized independently and gets its own summary row.
 * Returns the array of pending summary rows immediately; pipelines run in background.
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
 * the appropriate pipeline. Optionally accepts a new format.
 */
export const regenerateSummary = async (
  id: string,
  newFormat?: SummaryFormat
): Promise<SummaryRow> => {
  const existing = await getSummaryById(id);
  if (!existing) throw new Error(`Summary ${id} not found`);

  const format = newFormat ?? existing.format;

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

  if (existing.resource_id) {
    // Per-resource summary: fetch the single source resource
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

    runSummarizationPipeline(id, resource.extracted_text.trim(), format).catch(
      (pipelineError) => {
        console.error(
          `[regenerateSummary] Background pipeline failed for summary=${id}:`,
          pipelineError
        );
      }
    );
  } else {
    // General summary: re-fetch all source resources and run the general pipeline
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

    runGeneralSummarizationPipeline(id, usableResources, format).catch(
      (pipelineError) => {
        console.error(
          `[regenerateSummary] Background general pipeline failed for summary=${id}:`,
          pipelineError
        );
      }
    );
  }

  return updatedSummary as SummaryRow;
};
