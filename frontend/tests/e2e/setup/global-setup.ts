import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env.test") });
dotenv.config({ path: path.join(__dirname, "../../../.env.local"), override: false });

export const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL ?? "e2e-test@ezy.test",
  password: process.env.E2E_TEST_PASSWORD ?? "Test@12345",
  fullName: "E2E Test User",
};

export const TEST_WORKSPACE = {
  name: "E2E Test Workspace",
  description: "Workspace seeded by Playwright global-setup",
  aura: "#4ECDC4",
  auraKeyword: "Neon Tide",
};

export interface SeedData {
  userId: string;
  workspaceId: string;
  email: string;
}

const SEED_FILE = path.join(__dirname, ".seed-data.json");

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is required for E2E setup."
    );
  }
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for E2E setup. Add it to tests/e2e/.env.test"
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function findOrCreateTestUser(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<string> {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) throw listError;

  const existing = list.users.find((u) => u.email === TEST_USER.email);
  if (existing) {
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_USER.email,
    password: TEST_USER.password,
    email_confirm: true,
    user_metadata: { full_name: TEST_USER.fullName },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Failed to create E2E test user.");
  return data.user.id;
}

async function findOrCreateTestWorkspace(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string
): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from("workspaces")
    .select("id, slug")
    .eq("user_id", userId)
    .eq("name", TEST_WORKSPACE.name)
    .maybeSingle();

  if (findError) {
    console.warn(
      `[global-setup] workspace lookup non-fatal error: ${findError.message}`
    );
  }

  if (existing?.id) {
    return existing.id;
  }

  const slugSuffix = Math.random().toString(36).slice(2, 8);
  const slug = `e2e-test-workspace-${slugSuffix}`;

  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      user_id: userId,
      name: TEST_WORKSPACE.name,
      description: TEST_WORKSPACE.description,
      aura: TEST_WORKSPACE.aura,
      aura_keyword: TEST_WORKSPACE.auraKeyword,
      slug,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function globalSetup(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const userId = await findOrCreateTestUser(supabase);
  const workspaceId = await findOrCreateTestWorkspace(supabase, userId);

  const seed: SeedData = {
    userId,
    workspaceId,
    email: TEST_USER.email,
  };

  fs.writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), "utf8");

  console.log(
    `[global-setup] Seed ready  user=${userId}  workspace=${workspaceId}`
  );
}

export default globalSetup;
