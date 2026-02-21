import { apiClient } from "./api/axios-config";

// ─── Types ───────────────────────────────────────────────
export type ResourceType = "pdf" | "ppt" | "image" | "audio" | "youtube";
export type ResourceStatus = "uploading" | "processing" | "ready";

export interface Resource {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  url: string;
  size: number;
  type: ResourceType;
  status: ResourceStatus;
  created_at: string;
}

// ─── Queries (all routed through backend API) ────────────

/**
 * Insert a new resource via backend API
 */
export async function insertResource(data: {
  user_id: string;
  workspace_id: string;
  name: string;
  url: string;
  size: number;
  type: ResourceType;
  status: ResourceStatus;
}): Promise<Resource> {
  const response = await apiClient.post("/resources", data);
  return response.data.data as Resource;
}

/**
 * Fetch all resources for a given workspace via backend API
 */
export async function getWorkspaceResources(
  workspace_id: string
): Promise<Resource[]> {
  const response = await apiClient.get(`/resources/workspace/${workspace_id}`);
  return (response.data.data ?? []) as Resource[];
}

/**
 * Update the status (and optionally url) of a resource via backend API
 */
export async function updateResourceStatus(
  id: string,
  status: ResourceStatus,
  url?: string
): Promise<void> {
  await apiClient.patch(`/resources/${id}/status`, { status, url });
}

/**
 * Delete a resource via backend API
 */
export async function deleteResource(id: string): Promise<void> {
  await apiClient.delete(`/resources/${id}`);
}

/**
 * Get workspace id from slug via the backend API.
 * Uses the authenticated backend endpoint which has access
 * to the workspace data (the frontend Supabase client doesn't
 * have a session, so direct queries are blocked by RLS).
 */
export async function getWorkspaceIdBySlug(
  slug: string
): Promise<string | null> {
  console.log("Fetching workspace via backend API for slug:", slug);

  try {
    const response = await apiClient.get(`/workspaces/${slug}`);
    const workspace = response.data?.data;

    if (!workspace || !workspace.id) {
      console.warn(`No workspace found with slug: ${slug}`);
      return null;
    }

    console.log("Workspace found:", workspace.id);
    return workspace.id;
  } catch (err: unknown) {
    const error = err as { response?: { status?: number }; message?: string };
    if (error.response?.status === 404) {
      console.warn(`Workspace not found for slug: ${slug}`);
      return null;
    }
    console.error("Error fetching workspace by slug:", error.message);
    return null;
  }
}
