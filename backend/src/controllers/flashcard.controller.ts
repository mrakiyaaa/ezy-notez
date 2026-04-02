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

const VALID_CARD_STATUSES: FlashcardStatus[] = ["unknown", "known", "review"];

// ---------------------------------------------------------------------------
// Generation handlers
// ---------------------------------------------------------------------------

/**
 * POST /flashcards/generate
 * Body: { workspace_id, resource_ids, topic?, card_count? }
 */
export const generateFlashcardsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { workspace_id, resource_ids, topic, card_count } = req.body as {
      workspace_id?: string;
      resource_ids?: string[];
      topic?: string;
      card_count?: number;
    };

    console.log(`[generateFlashcardsHandler] Request from user ${userId}:`, {
      workspace_id,
      resource_ids,
      topic,
      card_count,
    });

    if (
      !workspace_id ||
      !Array.isArray(resource_ids) ||
      resource_ids.length === 0
    ) {
      res.status(400).json({
        status: "error",
        message: "workspace_id and a non-empty resource_ids array are required",
      });
      return;
    }

    console.log(`[generateFlashcardsHandler] Calling generateFlashcards service...`);
    const flashcardSet = await generateFlashcards(
      workspace_id,
      userId,
      resource_ids,
      topic,
      card_count
    );
    console.log(`[generateFlashcardsHandler] Created set ${flashcardSet.id} with status ${flashcardSet.status}`);
    res.status(201).json({ status: "success", data: flashcardSet });
  } catch (handlerError) {
    const message =
      handlerError instanceof Error
        ? handlerError.message
        : "Failed to generate flashcards";
    console.error("[generateFlashcardsHandler] Error:", handlerError);
    res.status(400).json({ status: "error", message });
  }
};

/**
 * POST /flashcards/:id/regenerate
 * Body: { topic?, card_count? }
 */
export const regenerateFlashcardSetHandler = async (
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
      res.status(400).json({ status: "error", message: "Set id is required" });
      return;
    }

    const { topic, card_count } = req.body as {
      topic?: string;
      card_count?: number;
    };

    const flashcardSet = await regenerateFlashcardSet(id, topic, card_count);
    res.status(200).json({ status: "success", data: flashcardSet });
  } catch (handlerError) {
    const message =
      handlerError instanceof Error
        ? handlerError.message
        : "Failed to regenerate flashcard set";
    console.error("[regenerateFlashcardSetHandler]", handlerError);
    res.status(400).json({ status: "error", message });
  }
};

// ---------------------------------------------------------------------------
// Query handlers
// ---------------------------------------------------------------------------

/**
 * GET /flashcards/workspace/:workspaceId
 */
export const getWorkspaceFlashcardSetsHandler = async (
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

    const sets = await getWorkspaceFlashcardSets(workspaceId);
    res.status(200).json({ status: "success", data: sets });
  } catch (handlerError) {
    const message =
      handlerError instanceof Error
        ? handlerError.message
        : "Failed to fetch flashcard sets";
    console.error("[getWorkspaceFlashcardSetsHandler]", handlerError);
    res.status(400).json({ status: "error", message });
  }
};

/**
 * GET /flashcards/:id
 */
export const getFlashcardSetByIdHandler = async (
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
      res.status(400).json({ status: "error", message: "Set id is required" });
      return;
    }

    const set = await getFlashcardSetById(id);
    if (!set) {
      res.status(404).json({ status: "error", message: "Flashcard set not found" });
      return;
    }

    res.status(200).json({ status: "success", data: set });
  } catch (handlerError) {
    const message =
      handlerError instanceof Error
        ? handlerError.message
        : "Failed to fetch flashcard set";
    console.error("[getFlashcardSetByIdHandler]", handlerError);
    res.status(400).json({ status: "error", message });
  }
};

// ---------------------------------------------------------------------------
// Update & deletion handlers
// ---------------------------------------------------------------------------

/**
 * PATCH /flashcards/:id/cards/:cardId/status
 * Body: { status: "unknown" | "known" | "review" }
 */
export const updateCardStatusHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { cardId } = req.params;
    if (!cardId) {
      res.status(400).json({ status: "error", message: "cardId is required" });
      return;
    }

    const { status } = req.body as { status?: FlashcardStatus };
    if (!status || !VALID_CARD_STATUSES.includes(status)) {
      res.status(400).json({
        status: "error",
        message: "status must be one of: unknown, known, review",
      });
      return;
    }

    await updateFlashcardStatus(cardId, status);
    res.status(200).json({ status: "success" });
  } catch (handlerError) {
    const message =
      handlerError instanceof Error
        ? handlerError.message
        : "Failed to update card status";
    console.error("[updateCardStatusHandler]", handlerError);
    res.status(400).json({ status: "error", message });
  }
};

/**
 * DELETE /flashcards/:id
 */
export const deleteFlashcardSetHandler = async (
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
      res.status(400).json({ status: "error", message: "Set id is required" });
      return;
    }

    await deleteFlashcardSet(id);
    res.status(200).json({ status: "success", message: "Flashcard set deleted" });
  } catch (handlerError) {
    const message =
      handlerError instanceof Error
        ? handlerError.message
        : "Failed to delete flashcard set";
    console.error("[deleteFlashcardSetHandler]", handlerError);
    res.status(400).json({ status: "error", message });
  }
};
