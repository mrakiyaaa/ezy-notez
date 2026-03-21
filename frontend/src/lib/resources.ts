import { apiClient } from "./api/axios-config";

// ─── Types ───────────────────────────────────────────────
export type ResourceType = "pdf" | "ppt" | "image" | "audio" | "youtube";
export type ResourceStatus = "uploading" | "indexing" | "processing" | "ready" | "failed";

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
  extracted_text: string | null;
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
 * Trigger server-side PDF text extraction for a resource.
 * The backend will:
 *  1. Set status → 'indexing'
 *  2. Fetch + parse the PDF
 *  3. Set status → 'ready' (or 'failed' on error) and store extracted_text
 */
export async function triggerExtraction(
  resourceId: string,
  fileUrl: string
): Promise<void> {
  await apiClient.post(`/resources/${resourceId}/extract`, { fileUrl });
}

/**
 * Trigger server-side audio transcription (Whisper) for a resource.
 * The backend will:
 *  1. Set status → 'indexing'
 *  2. Spawn Whisper to transcribe the audio
 *  3. Set status → 'ready' (or 'failed' on error) and store extracted_text
 */
export async function triggerAudioExtraction(
  resourceId: string,
  fileUrl: string
): Promise<void> {
  await apiClient.post(`/resources/${resourceId}/extract-audio`, { fileUrl });
}

/**
 * Minimal workspace info returned when resolving a slug.
 */
export interface WorkspaceInfo {
  id: string;
  name: string;
  description?: string;
  aura: string;
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
  const info = await getWorkspaceBySlug(slug);
  return info?.id ?? null;
}

/**
 * Get full workspace info from slug via the backend API.
 */
export async function getWorkspaceBySlug(
  slug: string
): Promise<WorkspaceInfo | null> {
  try {
    const response = await apiClient.get(`/workspaces/${slug}`);
    const workspace = response.data?.data;

    if (!workspace || !workspace.id) {
      return null;
    }

    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      aura: workspace.aura,
    };
  } catch (err: unknown) {
    const error = err as { response?: { status?: number }; message?: string };
    if (error.response?.status === 404) {
      return null;
    }
    console.error("Error fetching workspace by slug:", error.message);
    return null;
  }
}
