import { supabaseAdmin } from "../config/supabase";
import { UTApi } from "uploadthing/server";
import { spawn } from "child_process";
import path from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require("pdf-parse") as { PDFParse: new (opts: { url: string }) => { getText(): Promise<{ text: string }> } };

export type ResourceType = "pdf" | "ppt" | "image" | "audio" | "youtube";
export type ResourceStatus = "uploading" | "indexing" | "processing" | "ready" | "failed";

export interface ResourceRow {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  url: string;
  size: number;
  type: ResourceType;
  status: ResourceStatus;
  created_at: string;
  extracted_text: string | null;
}

export interface InsertResourceInput {
  user_id: string;
  workspace_id: string;
  name: string;
  url: string;
  size: number;
  type: ResourceType;
  status: ResourceStatus;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Spawn a Python script with a single file-URL argument and resolve with its
 * stdout (trimmed). Rejects if the process exits with a non-zero code or
 * fails to start.
 */
const spawnPythonScript = (scriptRelPath: string, fileUrl: string): Promise<string> => {
  const scriptPath = path.resolve(__dirname, scriptRelPath);

  return new Promise((resolve, reject) => {
    const proc = spawn("python", [scriptPath, fileUrl]);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Script exited with code ${code}: ${stderr.trim()}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn script: ${err.message}`));
    });
  });
};

/**
 * Shared extraction lifecycle:
 *   1. Mark resource as 'indexing'
 *   2. Run the provided extractor function to get the raw text
 *   3. Sanitize and store extracted text, mark 'ready'
 *   4. On any error, mark 'failed' (best-effort) and re-throw
 */
const runExtractionPipeline = async (
  id: string,
  label: string,
  extractor: () => Promise<string>
): Promise<void> => {
  await supabaseAdmin.from("resources").update({ status: "indexing" }).eq("id", id);

  try {
    const rawText = await extractor();

    // Strip null bytes — rejected by PostgreSQL's text type
    const extractedText = rawText.replace(/\0/g, "");

    const { error } = await supabaseAdmin
      .from("resources")
      .update({ extracted_text: extractedText, status: "ready" })
      .eq("id", id);

    if (error) throw new Error(`Supabase update failed: ${error.message}`);
  } catch (err) {
    console.error(`[${label}] resource=${id}`, err);

    await supabaseAdmin
      .from("resources")
      .update({ status: "failed" })
      .eq("id", id)
      .then(({ error: e }) => {
        if (e) console.error(`[${label}] failed to set status=failed:`, e);
      });

    throw err;
  }
};

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Insert a new resource
 */
export const insertResource = async (
  data: InsertResourceInput
): Promise<ResourceRow> => {
  const { data: resource, error } = await supabaseAdmin
    .from("resources")
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert resource: ${error.message}`);
  }

  return resource as ResourceRow;
};

/**
 * Get all resources for a workspace
 */
export const getWorkspaceResources = async (
  workspaceId: string
): Promise<ResourceRow[]> => {
  const { data, error } = await supabaseAdmin
    .from("resources")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch resources: ${error.message}`);
  }

  return (data ?? []) as ResourceRow[];
};

/**
 * Update resource status and optionally url
 */
export const updateResourceStatus = async (
  id: string,
  status: ResourceStatus,
  url?: string
): Promise<ResourceRow> => {
  const update: Record<string, string> = { status };
  if (url) update.url = url;

  const { data, error } = await supabaseAdmin
    .from("resources")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update resource: ${error.message}`);
  }

  return data as ResourceRow;
};

/**
 * Delete a resource (removes from both Supabase and Uploadthing)
 */
export const deleteResourceById = async (id: string): Promise<void> => {
  const { data: resource, error: fetchError } = await supabaseAdmin
    .from("resources")
    .select("url")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch resource before deletion: ${fetchError.message}`);
  }

  const { error } = await supabaseAdmin.from("resources").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete resource: ${error.message}`);
  }

  // Delete from Uploadthing — URLs follow: https://utfs.io/f/<fileKey>
  // Skip for non-Uploadthing URLs (e.g. YouTube links)
  if (resource?.url && resource.url.includes("utfs.io")) {
    try {
      const urlParts = resource.url.split("/f/");
      const fileKey = urlParts.length > 1 ? urlParts[urlParts.length - 1] : null;

      if (fileKey) {
        const utapi = new UTApi();
        await utapi.deleteFiles([fileKey]);
      }
    } catch (utErr) {
      // Log but don't throw — the DB record is already deleted
      console.error(`[deleteResourceById] Failed to delete file from Uploadthing:`, utErr);
    }
  }
};

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

/**
 * Fetch a PDF from its URL, extract its text with pdf-parse, and persist
 * the result (or a failure status) back to Supabase.
 */
export const extractAndStoreText = async (
  id: string,
  fileUrl: string
): Promise<void> => {
  await runExtractionPipeline(id, "extractAndStoreText", async () => {
    const parser = new PDFParse({ url: fileUrl });
    const { text } = await parser.getText();
    return text;
  });
};

/**
 * Transcribe an audio file via the Whisper Python script and persist the
 * transcript (or a failure status) back to Supabase.
 */
export const extractAndStoreAudio = async (
  id: string,
  fileUrl: string
): Promise<void> => {
  await runExtractionPipeline(id, "extractAndStoreAudio", () =>
    spawnPythonScript("../../scripts/whisper_transcribe.py", fileUrl)
  );
};

/**
 * Extract text from a PPTX file via the python-pptx script and persist the
 * result (or a failure status) back to Supabase.
 */
export const extractAndStorePptx = async (
  id: string,
  fileUrl: string
): Promise<void> => {
  await runExtractionPipeline(id, "extractAndStorePptx", () =>
    spawnPythonScript("../../scripts/pptx_extract.py", fileUrl)
  );
};

/**
 * Extract transcript from a YouTube video via youtube-transcript-api and
 * persist the result (or a failure status) back to Supabase.
 * The Python script outputs TITLE:<title> on the first line — we parse it
 * to update the resource name automatically.
 */
export const extractAndStoreYoutube = async (
  id: string,
  youtubeUrl: string
): Promise<void> => {
  await runExtractionPipeline(id, "extractAndStoreYoutube", async () => {
    const raw = await spawnPythonScript(
      "../../scripts/youtube_transcript.py",
      youtubeUrl
    );

    // Parse title from first line if present
    const lines = raw.split("\n");
    if (lines[0]?.startsWith("TITLE:")) {
      const title = lines[0].replace("TITLE:", "").trim();
      if (title) {
        await supabaseAdmin
          .from("resources")
          .update({ name: title })
          .eq("id", id);
      }
      // Return transcript without the TITLE line
      return lines.slice(1).join("\n").trim();
    }

    return raw;
  });
};
