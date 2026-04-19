export interface ChatSession {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface ChatSource {
  resource_id: string;
  chunk_text: string;
}

export interface ChatHistoryItem {
  id: string;
  workspace_id: string;
  user_id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  sources: ChatSource[] | null;
  created_at: string;
}

export interface ChatMessageResponse {
  response: string;
  sources: ChatSource[];
}

export interface EmbedResponse {
  success: boolean;
  chunks_embedded: number;
}
