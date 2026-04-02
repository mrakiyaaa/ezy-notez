import { Router } from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import {
  generateGeneralSummaryHandler,
  generateCustomSummariesHandler,
  getWorkspaceSummariesHandler,
  getSummaryByIdHandler,
  regenerateSummaryHandler,
  deleteSummaryHandler,
} from "../controllers/summary.controller";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Generate a general (workspace-wide) summary
router.post("/general", generateGeneralSummaryHandler);

// Generate per-resource summaries (customize mode)
router.post("/custom", generateCustomSummariesHandler);

// Get all summaries for a workspace
router.get("/workspace/:workspaceId", getWorkspaceSummariesHandler);

// Get a single summary by ID
router.get("/:id", getSummaryByIdHandler);

// Re-generate a summary
router.post("/:id/regenerate", regenerateSummaryHandler);

// Delete a summary
router.delete("/:id", deleteSummaryHandler);

export default router;
