import { createBrowserClient } from "@supabase/ssr";

// Provide placeholder values during build/prerender so the module can be
// evaluated without throwing.  The client is only used at runtime in the
// browser where the real env vars are always available.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"
);
