import { createClient } from "npm:@supabase/supabase-js@2.57.2";

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}

/**
 * Server-side equivalent of useFeatureGating's isFullAccess: Premium (via the
 * subscribers table synced by stripe-webhook), an admin-granted has_unlimited_access
 * flag, or an admin role. Used by edge functions that must not trust the client's
 * own premium check (e.g. AI-generation endpoints callable directly).
 */
export async function getFullAccess(userId: string): Promise<boolean> {
  const supabase = adminClient();

  const [{ data: subscriber }, { data: profile }, { data: role }] = await Promise.all([
    supabase.from("subscribers").select("status").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("has_unlimited_access").eq("user_id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
  ]);

  const isPremium = subscriber?.status === "active";
  const hasUnlimitedAccess = profile?.has_unlimited_access === true;
  const isAdmin = !!role;

  return isPremium || hasUnlimitedAccess || isAdmin;
}
