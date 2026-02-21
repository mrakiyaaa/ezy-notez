import type { Request, Response } from "express";
import {
  insertResource,
  getWorkspaceResources,
  updateResourceStatus,
  deleteResourceById,
  type InsertResourceInput,
  type ResourceStatus,
} from "../services/resource.service";

/**
 * POST /resources
 * Create a new resource
 */
export const createResourceHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const { workspace_id, name, url, size, type, status } = req.body;

    if (!workspace_id || !name || size === undefined || !type) {
      res.status(400).json({
        status: "error",
        message: "workspace_id, name, size, and type are required",
      });
      return;
    }

    const data: InsertResourceInput = {
      user_id: userId,
      workspace_id,
      name,
      url: url || "",
      size,
      type,
      status: status || "uploading",
    };

    const resource = await insertResource(data);

    res.status(201).json({
      status: "success",
      data: resource,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create resource";
    console.error("[createResourceHandler]", error);
    res.status(400).json({ status: "error", message });
  }
};

/**
 * GET /resources/workspace/:workspaceId
 * Get all resources for a workspace
 */
export const getResourcesByWorkspaceHandler = async (
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
      res.status(400).json({
        status: "error",
        message: "workspaceId is required",
      });
      return;
    }

    const resources = await getWorkspaceResources(workspaceId);

    res.status(200).json({
      status: "success",
      data: resources,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch resources";
    console.error("[getResourcesByWorkspaceHandler]", error);
    res.status(400).json({ status: "error", message });
  }
};

/**
 * PATCH /resources/:id/status
 * Update a resource's status
 */
export const updateResourceStatusHandler = async (
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
    const { status, url } = req.body as { status: ResourceStatus; url?: string };

    if (!id || !status) {
      res.status(400).json({
        status: "error",
        message: "id and status are required",
      });
      return;
    }

    const resource = await updateResourceStatus(id, status, url);

    res.status(200).json({
      status: "success",
      data: resource,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update resource";
    console.error("[updateResourceStatusHandler]", error);
    res.status(400).json({ status: "error", message });
  }
};

/**
 * DELETE /resources/:id
 * Delete a resource
 */
export const deleteResourceHandler = async (
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
      res.status(400).json({
        status: "error",
        message: "Resource id is required",
      });
      return;
    }

    await deleteResourceById(id);

    res.status(200).json({
      status: "success",
      message: "Resource deleted",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete resource";
    console.error("[deleteResourceHandler]", error);
    res.status(400).json({ status: "error", message });
  }
};
