import type { Request, Response, RequestHandler } from "express";
import {
  insertResource,
  getWorkspaceResources,
  updateResourceStatus,
  deleteResourceById,
  extractAndStoreText,
  extractAndStoreAudio,
  extractAndStorePptx,
  extractAndStoreYoutube,
  type InsertResourceInput,
  type ResourceStatus,
} from "../services/resource.service";

// ---------------------------------------------------------------------------
// Private factory
// ---------------------------------------------------------------------------

/**
 * Builds an extraction request handler from a service function.
 * All three extraction endpoints share the same shape:
 *   - require auth
 *   - require id (param) + fileUrl (body)
 *   - call extractFn, return 200 on success or 500 on failure
 */
const makeExtractionHandler = (
  extractFn: (id: string, fileUrl: string) => Promise<void>,
  errorMsg: string
): RequestHandler =>
  async (req: Request, res: Response): Promise<void> => {
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

      await extractFn(id, fileUrl);

      res.status(200).json({ status: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : errorMsg;
      res.status(500).json({ status: "error", message });
    }
  };

// ---------------------------------------------------------------------------
// Resource CRUD handlers
// ---------------------------------------------------------------------------

/**
 * POST /resources
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
    res.status(201).json({ status: "success", data: resource });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create resource";
    console.error("[createResourceHandler]", error);
    res.status(400).json({ status: "error", message });
  }
};

/**
 * GET /resources/workspace/:workspaceId
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
      res.status(400).json({ status: "error", message: "workspaceId is required" });
      return;
    }

    const resources = await getWorkspaceResources(workspaceId);
    res.status(200).json({ status: "success", data: resources });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch resources";
    console.error("[getResourcesByWorkspaceHandler]", error);
    res.status(400).json({ status: "error", message });
  }
};

/**
 * PATCH /resources/:id/status
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
      res.status(400).json({ status: "error", message: "id and status are required" });
      return;
    }

    const resource = await updateResourceStatus(id, status, url);
    res.status(200).json({ status: "success", data: resource });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update resource";
    console.error("[updateResourceStatusHandler]", error);
    res.status(400).json({ status: "error", message });
  }
};

/**
 * DELETE /resources/:id
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
      res.status(400).json({ status: "error", message: "Resource id is required" });
      return;
    }

    await deleteResourceById(id);
    res.status(200).json({ status: "success", message: "Resource deleted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete resource";
    console.error("[deleteResourceHandler]", error);
    res.status(400).json({ status: "error", message });
  }
};

// ---------------------------------------------------------------------------
// Extraction handlers (generated via factory)
// ---------------------------------------------------------------------------

/** POST /resources/:id/extract — PDF text extraction */
export const extractResourceHandler = makeExtractionHandler(
  extractAndStoreText,
  "Failed to extract PDF text"
);

/** POST /resources/:id/extract-audio — audio transcription via Whisper */
export const extractAudioHandler = makeExtractionHandler(
  extractAndStoreAudio,
  "Failed to transcribe audio"
);

/** POST /resources/:id/extract-pptx — PPTX text extraction via python-pptx */
export const extractPptxHandler = makeExtractionHandler(
  extractAndStorePptx,
  "Failed to extract PPTX text"
);

/** POST /resources/:id/extract-youtube — YouTube transcript re-extraction */
export const extractYoutubeHandler = makeExtractionHandler(
  extractAndStoreYoutube,
  "Failed to extract YouTube transcript"
);

/**
 * POST /resources/youtube
 * Creates a YouTube resource and immediately triggers transcript extraction.
 * Body: { workspace_id, youtube_url, name? }
 */
export const createYoutubeResourceHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { workspace_id, youtube_url, name } = req.body;

    if (!workspace_id || !youtube_url) {
      res.status(400).json({
        status: "error",
        message: "workspace_id and youtube_url are required",
      });
      return;
    }

    // Validate YouTube URL format
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/;
    if (!youtubeRegex.test(youtube_url)) {
      res.status(400).json({
        status: "error",
        message: "Invalid YouTube URL",
      });
      return;
    }

    const data: InsertResourceInput = {
      user_id: userId,
      workspace_id,
      name: name || "YouTube Video",
      url: youtube_url,
      size: 0,
      type: "youtube",
      status: "indexing",
    };

    const resource = await insertResource(data);

    // Return resource immediately — extraction runs in background
    res.status(201).json({ status: "success", data: resource });

    // Fire-and-forget extraction
    extractAndStoreYoutube(resource.id, youtube_url).catch((err) => {
      console.error("[createYoutubeResourceHandler] extraction failed:", err);
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create YouTube resource";
    console.error("[createYoutubeResourceHandler]", error);
    res.status(400).json({ status: "error", message });
  }
};
