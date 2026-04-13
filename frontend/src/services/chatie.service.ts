import { apiClient } from "@/api/axios-config";
import type {
  ChatSession,
  ChatMessageResponse,
  ChatHistoryItem,
  EmbedResponse,
} from "@/types/chatie";

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function getSessions(workspaceId: string): Promise<ChatSession[]> {
  const response = await apiClient.get(`/chatie/sessions/${workspaceId}`);
  return (response.data.data?.sessions ?? []) as ChatSession[];
}

export async function createSession(
  workspaceId: string,
  title?: string
): Promise<ChatSession> {
  const response = await apiClient.post("/chatie/sessions", {
    workspace_id: workspaceId,
    title,
  });
  return response.data.data.session as ChatSession;
}

export async function updateSessionTitle(
  sessionId: string,
  title: string
): Promise<void> {
  await apiClient.patch(`/chatie/sessions/${sessionId}`, { title });
}

export async function deleteSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/chatie/sessions/${sessionId}`);
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function sendChatMessage(
  workspaceId: string,
  sessionId: string,
  message: string,
  resourceIds: string[]
): Promise<ChatMessageResponse> {
  const response = await apiClient.post("/chatie/message", {
    workspace_id: workspaceId,
    session_id: sessionId,
    message,
    resource_ids: resourceIds,
  });
  return response.data.data as ChatMessageResponse;
}

export async function getChatHistory(
  workspaceId: string,
  sessionId: string
): Promise<ChatHistoryItem[]> {
  const response = await apiClient.get(
    `/chatie/history/${workspaceId}/${sessionId}`
  );
  return (response.data.data?.history ?? []) as ChatHistoryItem[];
}

export async function deleteChatHistory(
  workspaceId: string,
  sessionId: string
): Promise<void> {
  await apiClient.delete(`/chatie/history/${workspaceId}/${sessionId}`);
}

// ---------------------------------------------------------------------------
// Embedding
// ---------------------------------------------------------------------------

export async function embedResource(
  resourceId: string,
  workspaceId: string,
  text: string
): Promise<EmbedResponse> {
  const response = await apiClient.post("/chatie/embed", {
    resource_id: resourceId,
    workspace_id: workspaceId,
    text,
  });
  return response.data.data as EmbedResponse;
}
