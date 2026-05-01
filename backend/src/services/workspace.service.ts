import { supabaseAdmin } from "../config/supabase";
import { generateSlug, generateUniqueSlug } from "../utils/slugGenerator";
import { UTApi } from "uploadthing/server";

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  aura: string;
  auraKeyword: string;
}

export interface WorkspaceResponse {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description?: string;
  aura: string;
  aura_keyword: string;
  created_at: string;
}

/**
 * Check if a slug already exists for the given user
 */
const checkSlugExists = async (
  userId: string,
  slug: string
): Promise<boolean> => {
  const { data, error } = await supabaseAdmin
    .from("workspaces")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", slug)
    .single();

  // single() returns error if no row found, which is what we want
  return !error && !!data;
};

/**
 * Create a new workspace
 */
export const createWorkspace = async (
  userId: string,
  input: CreateWorkspaceInput
): Promise<WorkspaceResponse> => {
  if (!input.name || input.name.trim().length === 0) {
    throw new Error("Workspace name is required");
  }

  if (!input.aura || input.aura.trim().length === 0) {
    throw new Error("Workspace aura is required");
  }

  if (!input.auraKeyword || input.auraKeyword.trim().length === 0) {
    throw new Error("Workspace aura keyword is required");
  }

  // Generate base slug
  const baseSlug = generateSlug(input.name);

  if (!baseSlug) {
    throw new Error("Workspace name must contain at least one valid character");
  }

  // Generate unique slug
  const slug = await generateUniqueSlug(baseSlug, (checkSlug) =>
    checkSlugExists(userId, checkSlug)
  );

  // Insert workspace into database
  const { data, error } = await supabaseAdmin
    .from("workspaces")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      aura: input.aura.trim(),
      aura_keyword: input.auraKeyword.trim(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create workspace: ${error.message}`);
  }

  return data as WorkspaceResponse;
};

/**
 * Get all workspaces for a user
 */
export const getUserWorkspaces = async (
  userId: string
): Promise<WorkspaceResponse[]> => {
  const { data, error } = await supabaseAdmin
    .from("workspaces")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch workspaces: ${error.message}`);
  }

  return (data || []) as WorkspaceResponse[];
};

/**
 * Delete a workspace by id for a user.
 * Also removes all associated resources from both Supabase and UploadThing.
 */
export const deleteWorkspace = async (
  userId: string,
  workspaceId: string
): Promise<void> => {
  // 1. Fetch all resources belonging to this workspace so we can clean up files
  const { data: resources, error: fetchErr } = await supabaseAdmin
    .from("resources")
    .select("id, url")
    .eq("workspace_id", workspaceId);

  if (fetchErr) {
    throw new Error(`Failed to fetch workspace resources: ${fetchErr.message}`);
  }

  // 2. Extract UploadThing file keys from resource URLs
  const fileKeys: string[] = [];
  for (const r of resources ?? []) {
    if (r.url) {
      const parts = r.url.split("/f/");
      const key = parts.length > 1 ? parts[parts.length - 1] : null;
      if (key) fileKeys.push(key);
    }
  }

  // 3. Delete resource rows from the database
  if (resources && resources.length > 0) {
    const { error: delResErr } = await supabaseAdmin
      .from("resources")
      .delete()
      .eq("workspace_id", workspaceId);

    if (delResErr) {
      throw new Error(`Failed to delete workspace resources: ${delResErr.message}`);
    }
  }

  // 4. Delete the workspace itself
  const { error } = await supabaseAdmin
    .from("workspaces")
    .delete()
    .eq("id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete workspace: ${error.message}`);
  }

  // 5. Delete files from UploadThing (best-effort, after DB cleanup)
  if (fileKeys.length > 0) {
    try {
      const utapi = new UTApi();
      await utapi.deleteFiles(fileKeys);
    } catch (utErr) {
      console.error("[deleteWorkspace] Failed to delete UploadThing files:", utErr);
    }
  }
};

/**
 * Get a single workspace by slug for a user
 */
export const getWorkspaceBySlug = async (
  userId: string,
  slug: string
): Promise<WorkspaceResponse> => {
  const { data, error } = await supabaseAdmin
    .from("workspaces")
    .select("*")
    .eq("user_id", userId)
    .eq("slug", slug)
    .single();

  if (error) {
    throw new Error(`Workspace not found: ${error.message}`);
  }

  return data as WorkspaceResponse;
};

/**
 * Get a single workspace by id for a user
 */
export const getWorkspaceById = async (
  userId: string,
  workspaceId: string
): Promise<WorkspaceResponse> => {
  const { data, error } = await supabaseAdmin
    .from("workspaces")
    .select("*")
    .eq("user_id", userId)
    .eq("id", workspaceId)
    .single();

  if (error) {
    throw new Error(`Workspace not found: ${error.message}`);
  }

  return data as WorkspaceResponse;
};
