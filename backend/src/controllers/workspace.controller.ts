import type { Request, Response } from "express";
import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceBySlug,
  getWorkspaceById,
  deleteWorkspace,
  type CreateWorkspaceInput,
} from "../services/workspace.service";

/**
 * POST /workspaces
 * Create a new workspace
 */
export const createWorkspaceHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { name, description, aura, auraKeyword } = req.body as CreateWorkspaceInput;

    // Validate required fields
    if (!name) {
      res
        .status(400)
        .json({ status: "error", message: "Workspace name is required" });
      return;
    }

    if (!aura) {
      res
        .status(400)
        .json({ status: "error", message: "Workspace aura is required" });
      return;
    }

    if (!auraKeyword) {
      res
        .status(400)
        .json({ status: "error", message: "Workspace aura keyword is required" });
      return;
    }

    const workspace = await createWorkspace(userId, {
      name,
      description,
      aura,
      auraKeyword,
    });

    res.status(201).json({
      status: "success",
      message: "Workspace created successfully",
      data: workspace,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create workspace";
    console.error("[createWorkspaceHandler]", error);

    res.status(400).json({
      status: "error",
      message,
    });
  }
};

/**
 * GET /workspaces
 * Get all workspaces for the authenticated user
 */
export const getWorkspacesHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const workspaces = await getUserWorkspaces(userId);

    res.status(200).json({
      status: "success",
      message: "Workspaces fetched successfully",
      data: workspaces,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch workspaces";
    console.error("[getWorkspacesHandler]", error);

    res.status(400).json({
      status: "error",
      message,
    });
  }
};

/**
 * GET /workspaces/:slug
 * Get a single workspace by slug
 */
export const getWorkspaceBySlugHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { slug } = req.params;

    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    if (!slug) {
      res.status(400).json({
        status: "error",
        message: "Workspace slug is required",
      });
      return;
    }

    const workspace = await getWorkspaceBySlug(userId, slug);

    res.status(200).json({
      status: "success",
      message: "Workspace fetched successfully",
      data: workspace,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Workspace not found";
    console.error("[getWorkspaceBySlugHandler]", error);

    res.status(404).json({
      status: "error",
      message,
    });
  }
};

/**
 * GET /workspaces/by-id/:id
 * Get a single workspace by id
 */
export const getWorkspaceByIdHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    if (!id) {
      res.status(400).json({
        status: "error",
        message: "Workspace id is required",
      });
      return;
    }

    const workspace = await getWorkspaceById(userId, id);

    res.status(200).json({
      status: "success",
      message: "Workspace fetched successfully",
      data: workspace,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Workspace not found";
    console.error("[getWorkspaceByIdHandler]", error);

    res.status(404).json({
      status: "error",
      message,
    });
  }
};

/**
 * DELETE /workspaces/:id
 * Delete a workspace by id
 */
export const deleteWorkspaceHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    await deleteWorkspace(userId, id);

    res.status(200).json({
      status: "success",
      message: "Workspace deleted successfully",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete workspace";
    console.error("[deleteWorkspaceHandler]", error);

    res.status(400).json({ status: "error", message });
  }
};
