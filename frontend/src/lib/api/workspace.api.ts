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
 * Create a new workspace
 */
export const createWorkspaceApi = async (
  data: CreateWorkspaceInput
): Promise<Workspace> => {
  const response = await apiClient.post("/workspaces", data);
  return response.data.data;
};

export const workspaceApi = {
  async getAll(): Promise<Workspace[]> {
    const response = await apiClient.get("/workspaces");
    return response.data.data;
  },

  async getBySlug(slug: string): Promise<Workspace> {
    const response = await apiClient.get(`/workspaces/${slug}`);
    return response.data.data;
  },

  async create(data: CreateWorkspaceInput): Promise<Workspace> {
    const response = await apiClient.post("/workspaces", data);
    return response.data.data;
  },
};
