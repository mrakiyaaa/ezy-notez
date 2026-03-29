import { Router } from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import {
  createResourceHandler,
  createYoutubeResourceHandler,
  getResourcesByWorkspaceHandler,
  updateResourceStatusHandler,
  deleteResourceHandler,
  extractResourceHandler,
  extractAudioHandler,
  extractPptxHandler,
  extractYoutubeHandler,
} from "../controllers/resource.controller";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Create a new resource
router.post("/", createResourceHandler);

// Create YouTube resource and extract transcript
router.post("/youtube", createYoutubeResourceHandler);

// Get all resources for a workspace
router.get("/workspace/:workspaceId", getResourcesByWorkspaceHandler);

// Update resource status
router.patch("/:id/status", updateResourceStatusHandler);

// Delete a resource
router.delete("/:id", deleteResourceHandler);

// Extract PDF text and store in extracted_text column
router.post("/:id/extract", extractResourceHandler);

// Extract audio transcript via Whisper and store in extracted_text column
router.post("/:id/extract-audio", extractAudioHandler);

// Extract PPTX text via python-pptx and store in extracted_text column
router.post("/:id/extract-pptx", extractPptxHandler);

// Extract YouTube transcript via youtube-transcript-api and store in extracted_text column
router.post("/:id/extract-youtube", extractYoutubeHandler);

export default router;
