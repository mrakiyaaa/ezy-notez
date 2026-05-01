import { apiClient } from "./axios-config";
import { CreateWorkspaceInput, Workspace } from "@/types/workspace";

/**
 * Get all workspaces for the authenticated user
 */
export const getWorkspacesApi = async (): Promise<Workspace[]> => {
  const response = await apiClient.get("/workspaces");
  return response.data.data;
};

/**
 * Get a single workspace by slug
 */
export const getWorkspaceBySlugApi = async (slug: string): Promise<Workspace> => {
  const response = await apiClient.get(`/workspaces/${slug}`);
  return response.data.data;
};

/**
 * Get a single workspace by id
 */
export const getWorkspaceByIdApi = async (id: string): Promise<Workspace> => {
  const response = await apiClient.get(`/workspaces/by-id/${id}`);
  return response.data.data;
};

/**
 * Create a new workspace
 */
export const createWorkspaceApi = async (
  data: CreateWorkspaceInput
): Promise<Workspace> => {
  const response = await apiClient.post("/workspaces", data);
  return response.data.data;
};

/**
 * Delete a workspace by id
 */
export const deleteWorkspaceApi = async (id: string): Promise<void> => {
  await apiClient.delete(`/workspaces/${id}`);
};

