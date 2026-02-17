import { Router } from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import {
  createWorkspaceHandler,
  getWorkspacesHandler,
  getWorkspaceBySlugHandler,
} from "../controllers/workspace.controller";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// List all workspaces for authenticated user
router.get("/", getWorkspacesHandler);

// Create new workspace
router.post("/", createWorkspaceHandler);

// Get workspace by slug
router.get("/:slug", getWorkspaceBySlugHandler);

export default router;
