import type { Request, Response } from "express";
import {
  generateFlashcards,
  getWorkspaceFlashcardSets,
  getFlashcardSetById,
  deleteFlashcardSet,
  updateFlashcardStatus,
  regenerateFlashcardSet,
  type FlashcardStatus,
} from "../services/flashcard.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_CARD_STATUSES: FlashcardStatus[] = ["unknown", "known", "review"];

const getUserId = (req: Request): string | null => req.user?.id ?? null;

const sendError = (res: Response, status: number, message: string) => {
  res.status(status).json({ status: "error", message });
};

const sendSuccess = (res: Response, data?: unknown, status = 200) => {
  res.status(status).json({ status: "success", ...(data !== undefined && { data }) });
};

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/** POST /flashcards/generate */
export const generateFlashcardsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { workspace_id, resource_ids, topic, card_count } = req.body;

    if (!workspace_id || !Array.isArray(resource_ids) || resource_ids.length === 0) {
      return sendError(res, 400, "workspace_id and a non-empty resource_ids array are required");
    }

    const set = await generateFlashcards(workspace_id, userId, resource_ids, topic, card_count);
    sendSuccess(res, set, 201);
  } catch (err) {
    console.error("[flashcard:generate]", err);
    sendError(res, 500, err instanceof Error ? err.message : "Failed to generate flashcards");
  }
};

/** POST /flashcards/:id/regenerate */
export const regenerateFlashcardSetHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { id } = req.params;
    if (!id) return sendError(res, 400, "Set id is required");

    const { topic, card_count } = req.body;
    const set = await regenerateFlashcardSet(id, topic, card_count);
    sendSuccess(res, set);
  } catch (err) {
    console.error("[flashcard:regenerate]", err);
    const msg = err instanceof Error ? err.message : "Failed to regenerate flashcard set";
    sendError(res, msg.includes("not found") ? 404 : 500, msg);
  }
};

/** GET /flashcards/workspace/:workspaceId */
export const getWorkspaceFlashcardSetsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { workspaceId } = req.params;
    if (!workspaceId) return sendError(res, 400, "workspaceId is required");

    const sets = await getWorkspaceFlashcardSets(workspaceId);
    sendSuccess(res, sets);
  } catch (err) {
    console.error("[flashcard:list]", err);
    sendError(res, 500, err instanceof Error ? err.message : "Failed to fetch flashcard sets");
  }
};

/** GET /flashcards/:id */
export const getFlashcardSetByIdHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { id } = req.params;
    if (!id) return sendError(res, 400, "Set id is required");

    const set = await getFlashcardSetById(id);
    if (!set) return sendError(res, 404, "Flashcard set not found");

    sendSuccess(res, set);
  } catch (err) {
    console.error("[flashcard:get]", err);
    sendError(res, 500, err instanceof Error ? err.message : "Failed to fetch flashcard set");
  }
};

/** PATCH /flashcards/:id/cards/:cardId/status */
export const updateCardStatusHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { cardId } = req.params;
    if (!cardId) return sendError(res, 400, "cardId is required");

    const { status } = req.body as { status?: FlashcardStatus };
    if (!status || !VALID_CARD_STATUSES.includes(status)) {
      return sendError(res, 400, "status must be one of: unknown, known, review");
    }

    await updateFlashcardStatus(cardId, status);
    sendSuccess(res);
  } catch (err) {
    console.error("[flashcard:updateStatus]", err);
    sendError(res, 500, err instanceof Error ? err.message : "Failed to update card status");
  }
};

/** DELETE /flashcards/:id */
export const deleteFlashcardSetHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const { id } = req.params;
    if (!id) return sendError(res, 400, "Set id is required");

    await deleteFlashcardSet(id);
    sendSuccess(res, { message: "Flashcard set deleted" });
  } catch (err) {
    console.error("[flashcard:delete]", err);
    sendError(res, 500, err instanceof Error ? err.message : "Failed to delete flashcard set");
  }
};
