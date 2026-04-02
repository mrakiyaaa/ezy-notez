import { Router } from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import {
  generateFlashcardsHandler,
  getWorkspaceFlashcardSetsHandler,
  getFlashcardSetByIdHandler,
  deleteFlashcardSetHandler,
  updateCardStatusHandler,
  regenerateFlashcardSetHandler,
} from "../controllers/flashcard.controller";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Generate flashcards from resources
router.post("/generate", generateFlashcardsHandler);

// Get all flashcard sets for a workspace
router.get("/workspace/:workspaceId", getWorkspaceFlashcardSetsHandler);

// Get a single flashcard set by ID (includes cards)
router.get("/:id", getFlashcardSetByIdHandler);

// Re-generate flashcards for an existing set
router.post("/:id/regenerate", regenerateFlashcardSetHandler);

// Update a card's status (known/review/unknown)
router.patch("/:id/cards/:cardId/status", updateCardStatusHandler);

// Delete a flashcard set
router.delete("/:id", deleteFlashcardSetHandler);

export default router;
