import { apiClient } from "@/api/axios-config";
import type {
  Resource,
  ResourceType,
  ResourceStatus,
  WorkspaceInfo,
} from "@/types/resource";

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

export async function getWorkspaceResources(
  workspace_id: string
): Promise<Resource[]> {
  const response = await apiClient.get(`/resources/workspace/${workspace_id}`);
  return (response.data.data ?? []) as Resource[];
}

export async function updateResourceStatus(
  id: string,
  status: ResourceStatus,
  url?: string
): Promise<void> {
  await apiClient.patch(`/resources/${id}/status`, { status, url });
}

export async function deleteResource(id: string): Promise<void> {
  await apiClient.delete(`/resources/${id}`);
}

export async function triggerExtraction(
  resourceId: string,
  fileUrl: string
): Promise<void> {
  await apiClient.post(`/resources/${resourceId}/extract`, { fileUrl });
}

export async function triggerAudioExtraction(
  resourceId: string,
  fileUrl: string
): Promise<void> {
  await apiClient.post(`/resources/${resourceId}/extract-audio`, { fileUrl });
}

export async function triggerPptxExtraction(
  resourceId: string,
  fileUrl: string
): Promise<void> {
  await apiClient.post(`/resources/${resourceId}/extract-pptx`, { fileUrl });
}

export async function createYoutubeResource(data: {
  workspace_id: string;
  youtube_url: string;
  name?: string;
}): Promise<Resource> {
  const response = await apiClient.post("/resources/youtube", data);
  return response.data.data as Resource;
}

export async function triggerYoutubeExtraction(
  resourceId: string,
  youtubeUrl: string
): Promise<void> {
  await apiClient.post(`/resources/${resourceId}/extract-youtube`, {
    fileUrl: youtubeUrl,
  });
}

export async function getWorkspaceIdBySlug(
  slug: string
): Promise<string | null> {
  const info = await getWorkspaceBySlug(slug);
  return info?.id ?? null;
}

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
