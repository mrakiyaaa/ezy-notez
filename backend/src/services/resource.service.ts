import { supabaseAdmin } from "../config/supabase";

export type ResourceType = "pdf" | "ppt" | "image" | "audio" | "youtube";
export type ResourceStatus = "uploading" | "processing" | "ready";

export interface ResourceRow {
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

export interface InsertResourceInput {
  user_id: string;
  workspace_id: string;
  name: string;
  url: string;
  size: number;
  type: ResourceType;
  status: ResourceStatus;
}

/**
 * Insert a new resource
 */
export const insertResource = async (
  data: InsertResourceInput
): Promise<ResourceRow> => {
  const { data: resource, error } = await supabaseAdmin
    .from("resources")
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert resource: ${error.message}`);
  }

  return resource as ResourceRow;
};

/**
 * Get all resources for a workspace
 */
export const getWorkspaceResources = async (
  workspaceId: string
): Promise<ResourceRow[]> => {
  const { data, error } = await supabaseAdmin
    .from("resources")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch resources: ${error.message}`);
  }

  return (data ?? []) as ResourceRow[];
};

/**
 * Update resource status and optionally url
 */
export const updateResourceStatus = async (
  id: string,
  status: ResourceStatus,
  url?: string
): Promise<ResourceRow> => {
  const update: Record<string, string> = { status };
  if (url) update.url = url;

  const { data, error } = await supabaseAdmin
    .from("resources")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update resource: ${error.message}`);
  }

  return data as ResourceRow;
};

/**
 * Delete a resource
 */
export const deleteResourceById = async (id: string): Promise<void> => {
  const { error } = await supabaseAdmin
    .from("resources")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete resource: ${error.message}`);
  }
};
