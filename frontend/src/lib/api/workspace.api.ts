import { apiClient } from "./axios-config";

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export const workspaceApi = {
  async getAll(): Promise<Workspace[]> {
    const response = await apiClient.get("/workspaces");
    return response.data.data;
  },

  async getById(id: string): Promise<Workspace> {
    const response = await apiClient.get(`/workspaces/${id}`);
    return response.data.data;
  },

  async create(data: {
    name: string;
    description?: string;
    color?: string;
  }): Promise<Workspace> {
    const response = await apiClient.post("/workspaces", data);
    return response.data.data;
  },

  async update(
    id: string,
    data: Partial<{ name: string; description: string; color: string }>
  ): Promise<Workspace> {
    const response = await apiClient.patch(`/workspaces/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/workspaces/${id}`);
  },
};
