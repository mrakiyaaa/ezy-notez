import { createBrowserClient } from "@supabase/ssr";

// Provide placeholder values during build/prerender so the module can be
// evaluated without throwing.  The client is only used at runtime in the
// browser where the real env vars are always available.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"
);

// Ensure the Realtime client is using the user's JWT before subscribing to
// any postgres_changes channel. Without this, the channel may join with the
// anon apikey, which causes RLS-protected change events to never reach the
// client. supabase-js auto-syncs auth via SIGNED_IN/TOKEN_REFRESHED events,
// but never on INITIAL_SESSION — so on a cold page load with a persisted
// session, the realtime client can stay on the anon key.
export async function ensureRealtimeAuth(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? null;
  await supabase.realtime.setAuth(token);
  return token;
}
