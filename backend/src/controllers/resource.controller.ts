import type { Request, Response } from "express";
import {
  insertResource,
  getWorkspaceResources,
  updateResourceStatus,
  deleteResourceById,
  extractAndStoreText,
  extractAndStoreAudio,
  extractAndStorePptx,
  type InsertResourceInput,
  type ResourceStatus,
} from "../services/resource.service";

/**
 * POST /resources
 * Create a new resource
 */
export const createResourceHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { workspace_id, name, url, size, type, status } = req.body;

    if (!workspace_id || !name || size === undefined || !type) {
      res.status(400).json({
        status: "error",
        message: "workspace_id, name, size, and type are required",
      });
      return;
    }

    const data: InsertResourceInput = {
      user_id: userId,
      workspace_id,
      name,
      url: url || "",
      size,
      type,
      status: status || "uploading",
    };

    const resource = await insertResource(data);

    res.status(201).json({
      status: "success",
      data: resource,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create resource";
    console.error("[createResourceHandler]", error);
    res.status(400).json({ status: "error", message });
  }
};

/**
 * GET /resources/workspace/:workspaceId
 * Get all resources for a workspace
 */
export const getResourcesByWorkspaceHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { workspaceId } = req.params;

    if (!workspaceId) {
      res.status(400).json({
        status: "error",
        message: "workspaceId is required",
      });
      return;
    }

    const resources = await getWorkspaceResources(workspaceId);

    res.status(200).json({
      status: "success",
      data: resources,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch resources";
    console.error("[getResourcesByWorkspaceHandler]", error);
    res.status(400).json({ status: "error", message });
  }
};

/**
 * PATCH /resources/:id/status
 * Update a resource's status
 */
export const updateResourceStatusHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const { status, url } = req.body as { status: ResourceStatus; url?: string };

    if (!id || !status) {
      res.status(400).json({
        status: "error",
        message: "id and status are required",
      });
      return;
    }

    const resource = await updateResourceStatus(id, status, url);

    res.status(200).json({
      status: "success",
      data: resource,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update resource";
    console.error("[updateResourceStatusHandler]", error);
    res.status(400).json({ status: "error", message });
  }
};

/**
 * DELETE /resources/:id
 * Delete a resource
 */
export const deleteResourceHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        status: "error",
        message: "Resource id is required",
      });
      return;
    }

    await deleteResourceById(id);

    res.status(200).json({
      status: "success",
      message: "Resource deleted",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete resource";
    console.error("[deleteResourceHandler]", error);
    res.status(400).json({ status: "error", message });
  }
};

/**
 * POST /resources/:id/extract
 * Fetch the PDF at fileUrl, extract its text with pdf-parse, and persist
 * the result to Supabase.  Status transitions: uploading → indexing → ready | failed
 */
export const extractResourceHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const { fileUrl } = req.body as { fileUrl?: string };

    if (!id || !fileUrl) {
      res.status(400).json({
        status: "error",
        message: "id (param) and fileUrl (body) are required",
      });
      return;
    }

    await extractAndStoreText(id, fileUrl);

    res.status(200).json({
      status: "success",
      message: "Text extracted and stored",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to extract PDF text";
    console.error("[extractResourceHandler]", error);
    res.status(500).json({ status: "error", message });
  }
};

/**
 * POST /resources/:id/extract-audio
 * Spawn the Whisper Python script to transcribe the audio file, then persist
 * the result to Supabase.  Status transitions: uploading → indexing → ready | failed
 */
export const extractAudioHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const { fileUrl } = req.body as { fileUrl?: string };

    if (!id || !fileUrl) {
      res.status(400).json({
        status: "error",
        message: "id (param) and fileUrl (body) are required",
      });
      return;
    }

    await extractAndStoreAudio(id, fileUrl);

    res.status(200).json({
      status: "success",
      message: "Audio transcribed and stored",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to extract audio text";
    console.error("[extractAudioHandler]", error);
    res.status(500).json({ status: "error", message });
  }
};

/**
 * POST /resources/:id/extract-pptx
 * Spawn the python-pptx script to extract text from the PPTX file, then persist
 * the result to Supabase.  Status transitions: uploading → indexing → ready | failed
 */
export const extractPptxHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const { fileUrl } = req.body as { fileUrl?: string };

    if (!id || !fileUrl) {
      res.status(400).json({
        status: "error",
        message: "id (param) and fileUrl (body) are required",
      });
      return;
    }

    await extractAndStorePptx(id, fileUrl);

    res.status(200).json({
      status: "success",
      message: "PPTX text extracted and stored",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to extract PPTX text";
    console.error("[extractPptxHandler]", error);
    res.status(500).json({ status: "error", message });
  }
};
