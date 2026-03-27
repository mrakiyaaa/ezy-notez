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
 * Fetch a PDF from its URL, extract its text with pdf-parse, and persist
 * the result (or a failure status) back to Supabase.
 *
 * Status transitions:
 *   current → 'indexing' (immediately)  → 'ready' | 'failed'
 */
export const extractAndStoreText = async (
  id: string,
  fileUrl: string
): Promise<void> => {
  // Mark as indexing first so the UI reflects progress immediately
  await supabaseAdmin
    .from("resources")
    .update({ status: "indexing" })
    .eq("id", id);

  try {
    const parser = new PDFParse({ url: fileUrl });
    const { text } = await parser.getText();

    // Strip null bytes (\u0000) — common in PDF-extracted text but
    // rejected by PostgreSQL's text type ("unsupported Unicode escape sequence").
    const sanitizedText = text.replace(/\0/g, "");

    const { error } = await supabaseAdmin
      .from("resources")
      .update({ extracted_text: sanitizedText, status: "ready" })
      .eq("id", id);

    if (error) {
      throw new Error(`Supabase update failed: ${error.message}`);
    }
  } catch (err) {
    console.error(`[extractAndStoreText] resource=${id}`, err);

    // Best-effort failure marker — don't throw so callers can still respond
    await supabaseAdmin
      .from("resources")
      .update({ status: "failed" })
      .eq("id", id)
      .then(({ error: e }) => {
        if (e) console.error("[extractAndStoreText] failed to set status=failed:", e);
      });

    throw err;
  }
};

/**
 * Spawn the Whisper Python script to transcribe an audio file, then persist
 * the result (or a failure status) back to Supabase.
 *
 * Status transitions:
 *   current → 'indexing' (immediately)  → 'ready' | 'failed'
 */
export const extractAndStoreAudio = async (
  id: string,
  fileUrl: string
): Promise<void> => {
  // Mark as indexing first so the UI reflects progress immediately
  await supabaseAdmin
    .from("resources")
    .update({ status: "indexing" })
    .eq("id", id);

  try {
    const scriptPath = path.resolve(__dirname, "../../scripts/whisper_transcribe.py");
    const transcript = await new Promise<string>((resolve, reject) => {
      const proc = spawn("python", [scriptPath, fileUrl]);

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
          reject(new Error(`Whisper script exited with code ${code}: ${stderr}`));
        }
      });

      proc.on("error", (err) => {
        reject(new Error(`Failed to spawn Whisper script: ${err.message}`));
      });
    });

    const { error } = await supabaseAdmin
      .from("resources")
      .update({ extracted_text: transcript, status: "ready" })
      .eq("id", id);

    if (error) {
      throw new Error(`Supabase update failed: ${error.message}`);
    }
  } catch (err) {
    console.error(`[extractAndStoreAudio] resource=${id}`, err);

    // Best-effort failure marker — don't throw so callers can still respond
    await supabaseAdmin
      .from("resources")
      .update({ status: "failed" })
      .eq("id", id)
      .then(({ error: e }) => {
        if (e) console.error("[extractAndStoreAudio] failed to set status=failed:", e);
      });

    throw err;
  }
};

/**
 * Spawn the python-pptx Python script to extract text from a PPTX file, then
 * persist the result (or a failure status) back to Supabase.
 *
 * Status transitions:
 *   current → 'indexing' (immediately)  → 'ready' | 'failed'
 */
export const extractAndStorePptx = async (
  id: string,
  fileUrl: string
): Promise<void> => {
  // Mark as indexing first so the UI reflects progress immediately
  await supabaseAdmin
    .from("resources")
    .update({ status: "indexing" })
    .eq("id", id);

  try {
    const scriptPath = path.resolve(__dirname, "../../scripts/pptx_extract.py");
    const extractedText = await new Promise<string>((resolve, reject) => {
      const proc = spawn("python", [scriptPath, fileUrl]);

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
          reject(new Error(`PPTX extract script exited with code ${code}: ${stderr}`));
        }
      });

      proc.on("error", (err) => {
        reject(new Error(`Failed to spawn PPTX extract script: ${err.message}`));
      });
    });

    // Strip null bytes — can appear in PPTX text and are rejected by PostgreSQL
    const sanitizedText = extractedText.replace(/\0/g, "");

    const { error } = await supabaseAdmin
      .from("resources")
      .update({ extracted_text: sanitizedText, status: "ready" })
      .eq("id", id);

    if (error) {
      throw new Error(`Supabase update failed: ${error.message}`);
    }
  } catch (err) {
    console.error(`[extractAndStorePptx] resource=${id}`, err);

    // Best-effort failure marker — don't throw so callers can still respond
    await supabaseAdmin
      .from("resources")
      .update({ status: "failed" })
      .eq("id", id)
      .then(({ error: e }) => {
        if (e) console.error("[extractAndStorePptx] failed to set status=failed:", e);
      });

    throw err;
  }
};

/**
 * Delete a resource (removes from both Supabase and Uploadthing)
 */
export const deleteResourceById = async (id: string): Promise<void> => {
  // Fetch the resource first so we can get the Uploadthing file key from the URL
  const { data: resource, error: fetchError } = await supabaseAdmin
    .from("resources")
    .select("url")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch resource before deletion: ${fetchError.message}`);
  }

  // Delete from Supabase
  const { error } = await supabaseAdmin
    .from("resources")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete resource: ${error.message}`);
  }

  // Delete from Uploadthing — extract file key from the URL
  // Uploadthing URLs follow the pattern: https://utfs.io/f/<fileKey>
  if (resource?.url) {
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
