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

export interface WorkspaceInfo {
  id: string;
  name: string;
  description?: string;
  aura: string;
}
