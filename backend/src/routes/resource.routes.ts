import { Router } from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import {
  createResourceHandler,
  getResourcesByWorkspaceHandler,
  updateResourceStatusHandler,
  deleteResourceHandler,
  extractResourceHandler,
} from "../controllers/resource.controller";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Create a new resource
router.post("/", createResourceHandler);

// Get all resources for a workspace
router.get("/workspace/:workspaceId", getResourcesByWorkspaceHandler);

// Update resource status
router.patch("/:id/status", updateResourceStatusHandler);

// Delete a resource
router.delete("/:id", deleteResourceHandler);

// Extract PDF text and store in extracted_text column
router.post("/:id/extract", extractResourceHandler);

export default router;
