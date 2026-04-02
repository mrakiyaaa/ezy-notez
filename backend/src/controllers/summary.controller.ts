import type { Request, Response } from "express";
import {
  generateGeneralSummary,
  generateResourceSummaries,
  getWorkspaceSummaries,
  getSummaryById,
  regenerateSummary,
  deleteSummary,
  type SummaryFormat,
} from "../services/summary.service";

const VALID_FORMATS: SummaryFormat[] = ["bullet", "short", "detailed"];

// ---------------------------------------------------------------------------
// Generation handlers
// ---------------------------------------------------------------------------

/**
 * POST /summaries/general
 * Body: { workspace_id, format }
 */
export const generateGeneralSummaryHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { workspace_id, format } = req.body as {
      workspace_id?: string;
      format?: SummaryFormat;
    };

    if (!workspace_id || !format || !VALID_FORMATS.includes(format)) {
      res.status(400).json({
        status: "error",
        message: "workspace_id and a valid format (bullet, short, detailed) are required",
      });
      return;
    }

    const summary = await generateGeneralSummary(workspace_id, userId, format);
    res.status(201).json({ status: "success", data: summary });
  } catch (handlerError) {
    const message =
      handlerError instanceof Error ? handlerError.message : "Failed to generate general summary";
    console.error("[generateGeneralSummaryHandler]", handlerError);
    res.status(400).json({ status: "error", message });
  }
};

/**
 * POST /summaries/custom
 * Body: { workspace_id, format, resource_ids: string[] }
 */
export const generateCustomSummariesHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { workspace_id, format, resource_ids } = req.body as {
      workspace_id?: string;
      format?: SummaryFormat;
      resource_ids?: string[];
    };

    if (
      !workspace_id ||
      !format ||
      !VALID_FORMATS.includes(format) ||
      !Array.isArray(resource_ids) ||
      resource_ids.length === 0
    ) {
      res.status(400).json({
        status: "error",
        message:
          "workspace_id, a valid format, and a non-empty resource_ids array are required",
      });
      return;
    }

    const summaries = await generateResourceSummaries(
      workspace_id,
      userId,
      format,
      resource_ids
    );
    res.status(201).json({ status: "success", data: summaries });
  } catch (handlerError) {
    const message =
      handlerError instanceof Error ? handlerError.message : "Failed to generate custom summaries";
    console.error("[generateCustomSummariesHandler]", handlerError);
    res.status(400).json({ status: "error", message });
  }
};

// ---------------------------------------------------------------------------
// Query handlers
// ---------------------------------------------------------------------------

/**
 * GET /summaries/workspace/:workspaceId
 */
export const getWorkspaceSummariesHandler = async (
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

    const summaries = await getWorkspaceSummaries(workspaceId);
    res.status(200).json({ status: "success", data: summaries });
  } catch (handlerError) {
    const message =
      handlerError instanceof Error ? handlerError.message : "Failed to fetch workspace summaries";
    console.error("[getWorkspaceSummariesHandler]", handlerError);
    res.status(400).json({ status: "error", message });
  }
};

/**
 * GET /summaries/:id
 */
export const getSummaryByIdHandler = async (
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
      res.status(400).json({ status: "error", message: "Summary id is required" });
      return;
    }

    const summary = await getSummaryById(id);
    if (!summary) {
      res.status(404).json({ status: "error", message: "Summary not found" });
      return;
    }

    res.status(200).json({ status: "success", data: summary });
  } catch (handlerError) {
    const message =
      handlerError instanceof Error ? handlerError.message : "Failed to fetch summary";
    console.error("[getSummaryByIdHandler]", handlerError);
    res.status(400).json({ status: "error", message });
  }
};

// ---------------------------------------------------------------------------
// Regeneration & deletion
// ---------------------------------------------------------------------------

/**
 * POST /summaries/:id/regenerate
 * Body: { format? }
 */
export const regenerateSummaryHandler = async (
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
      res.status(400).json({ status: "error", message: "Summary id is required" });
      return;
    }

    const { format } = req.body as { format?: SummaryFormat };
    if (format && !VALID_FORMATS.includes(format)) {
      res.status(400).json({ status: "error", message: "Invalid format" });
      return;
    }

    const summary = await regenerateSummary(id, format);
    res.status(200).json({ status: "success", data: summary });
  } catch (handlerError) {
    const message =
      handlerError instanceof Error ? handlerError.message : "Failed to regenerate summary";
    console.error("[regenerateSummaryHandler]", handlerError);
    res.status(400).json({ status: "error", message });
  }
};

/**
 * DELETE /summaries/:id
 */
export const deleteSummaryHandler = async (
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
      res.status(400).json({ status: "error", message: "Summary id is required" });
      return;
    }

    await deleteSummary(id);
    res.status(200).json({ status: "success", message: "Summary deleted" });
  } catch (handlerError) {
    const message =
      handlerError instanceof Error ? handlerError.message : "Failed to delete summary";
    console.error("[deleteSummaryHandler]", handlerError);
    res.status(400).json({ status: "error", message });
  }
};
