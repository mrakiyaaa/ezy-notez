import { apiClient } from "@/api/axios-config";
import type { Summary, SummaryFormat } from "@/types/summary";

export async function generateGeneralSummary(
  workspaceId: string,
  format: SummaryFormat
): Promise<Summary> {
  const response = await apiClient.post("/summaries/general", {
    workspace_id: workspaceId,
    format,
  });
  return response.data.data as Summary;
}

export async function generateCustomSummaries(
  workspaceId: string,
  format: SummaryFormat,
  resourceIds: string[]
): Promise<Summary[]> {
  const response = await apiClient.post("/summaries/custom", {
    workspace_id: workspaceId,
    format,
    resource_ids: resourceIds,
  });
  return (response.data.data ?? []) as Summary[];
}

export async function getWorkspaceSummaries(
  workspaceId: string
): Promise<Summary[]> {
  const response = await apiClient.get(
    `/summaries/workspace/${workspaceId}`
  );
  return (response.data.data ?? []) as Summary[];
}

export async function getSummaryById(id: string): Promise<Summary> {
  const response = await apiClient.get(`/summaries/${id}`);
  return response.data.data as Summary;
}

export async function regenerateSummary(
  id: string,
  format?: SummaryFormat
): Promise<Summary> {
  const response = await apiClient.post(`/summaries/${id}/regenerate`, {
    format,
  });
  return response.data.data as Summary;
}

export async function deleteSummary(id: string): Promise<void> {
  await apiClient.delete(`/summaries/${id}`);
}
