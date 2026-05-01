import { Router } from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import {
  createWorkspaceHandler,
  getWorkspacesHandler,
  getWorkspaceBySlugHandler,
  getWorkspaceByIdHandler,
  deleteWorkspaceHandler,
} from "../controllers/workspace.controller";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// List all workspaces for authenticated user
router.get("/", getWorkspacesHandler);

// Create new workspace
router.post("/", createWorkspaceHandler);

// Get workspace by id (must be declared before /:slug to avoid shadowing)
router.get("/by-id/:id", getWorkspaceByIdHandler);

// Get workspace by slug
router.get("/:slug", getWorkspaceBySlugHandler);

// Delete workspace by id
router.delete("/:id", deleteWorkspaceHandler);

export default router;
