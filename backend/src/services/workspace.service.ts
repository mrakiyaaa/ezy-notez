import { supabaseAdmin } from "../config/supabase";
import { generateSlug, generateUniqueSlug } from "../utils/slugGenerator";

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  aura: string;
}

export interface WorkspaceResponse {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description?: string;
  aura: string;
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
