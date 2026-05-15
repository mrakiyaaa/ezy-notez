import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import type { SeedData } from "./global-setup";

dotenv.config({ path: path.join(__dirname, "../.env.test") });
dotenv.config({ path: path.join(__dirname, "../../../.env.local"), override: false });

const SEED_FILE = path.join(__dirname, ".seed-data.json");
const AUTH_FILE = path.join(__dirname, ".auth-state.json");

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for E2E teardown."
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function globalTeardown(): Promise<void> {
  try {
    if (process.env.E2E_KEEP_SEED === "true") {
      console.log("[global-teardown] E2E_KEEP_SEED=true — skipping cleanup.");
      return;
    }

    if (!fs.existsSync(SEED_FILE)) {
      console.log("[global-teardown] No seed file. Nothing to clean.");
      return;
    }

    const seed: SeedData = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
    const supabase = getSupabaseAdmin();

    try {
      const { error: wsError } = await supabase
        .from("workspaces")
        .delete()
        .eq("user_id", seed.userId);
      if (wsError) {
        console.warn(`[global-teardown] workspace delete: ${wsError.message}`);
      }
    } catch (err) {
      console.warn("[global-teardown] workspace delete failed:", err);
    }

    try {
      const { error: userError } = await supabase.auth.admin.deleteUser(
        seed.userId
      );
      if (userError) {
        console.warn(`[global-teardown] user delete: ${userError.message}`);
      }
    } catch (err) {
      console.warn("[global-teardown] user delete failed:", err);
    }

    for (const file of [SEED_FILE, AUTH_FILE]) {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch (err) {
          console.warn(`[global-teardown] could not remove ${file}:`, err);
        }
      }
    }

    console.log("[global-teardown] Cleanup complete.");
  } catch (error) {
    console.error("[global-teardown] fatal error:", error);
  }
}

export default globalTeardown;
