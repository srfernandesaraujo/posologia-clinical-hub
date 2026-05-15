// Server-side gamification: validates user JWT, bounds points, dedupes by source_id,
// and grants badges based on cumulative stats. Replaces client-side INSERT to
// student_points / user_badges (which allowed arbitrary point values).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

// Whitelist of (source -> max points per insert)
const SOURCE_LIMITS: Record<string, number> = {
  simulator_case: 30,
  calculator_use: 5,
  daily_login: 10,
  game_completion: 100,
};

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function bad(msg: string, status = 400) { return ok({ error: msg }, status); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return bad("Unauthorized", 401);

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: auth } },
  });
  const token = auth.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return bad("Unauthorized", 401);
  const userId = claims.claims.sub as string;

  let body: any;
  try { body = await req.json(); } catch { return bad("Invalid JSON"); }

  const points = Number(body.points);
  const source = String(body.source || "");
  const simulatorSlug = body.simulator_slug ? String(body.simulator_slug) : null;
  const sourceId = body.source_id ? String(body.source_id) : null;

  if (!Number.isFinite(points) || points < 0) return bad("Invalid points");
  const limit = SOURCE_LIMITS[source];
  if (!limit) return bad("Invalid source");
  if (points > limit) return bad("Points exceed source limit");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Dedupe: if (user, source, source_id) already exists, no-op
  if (sourceId) {
    const { data: dup } = await admin.from("student_points")
      .select("id").eq("user_id", userId).eq("source", source).eq("source_id", sourceId).limit(1);
    if (dup && dup.length) return ok({ awarded: false, reason: "duplicate" });
  }

  // Daily login: only one per day
  if (source === "daily_login") {
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const { data: today } = await admin.from("student_points")
      .select("id").eq("user_id", userId).eq("source", "daily_login")
      .gte("created_at", todayStart.toISOString()).limit(1);
    if (today && today.length) return ok({ awarded: false, reason: "already_today" });
  }

  const { error: insErr } = await admin.from("student_points").insert({
    user_id: userId, points, source, simulator_slug: simulatorSlug, source_id: sourceId,
  } as any);
  if (insErr) { console.error("insert points error", insErr); return bad("Insert failed", 500); }

  // Recompute stats and award any new badges
  const { data: allPoints } = await admin.from("student_points")
    .select("points, source, simulator_slug, created_at").eq("user_id", userId).limit(5000);
  const totalPoints = (allPoints || []).reduce((a: number, p: any) => a + (p.points || 0), 0);
  const totalCases = (allPoints || []).filter((p: any) => p.source === "simulator_case").length;
  const simulatorCounts: Record<string, number> = {};
  (allPoints || []).forEach((p: any) => {
    if (p.simulator_slug) simulatorCounts[p.simulator_slug] = (simulatorCounts[p.simulator_slug] || 0) + 1;
  });
  const uniqueDays = [...new Set((allPoints || []).map((p: any) => new Date(p.created_at).toISOString().slice(0, 10)))].sort().reverse();
  let streak = 0;
  if (uniqueDays.length) {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (uniqueDays[0] === today || uniqueDays[0] === yesterday) {
      streak = 1;
      for (let i = 1; i < uniqueDays.length; i++) {
        const diff = (new Date(uniqueDays[i - 1]).getTime() - new Date(uniqueDays[i]).getTime()) / 86400000;
        if (diff === 1) streak++; else break;
      }
    }
  }

  const BADGE_RULES: Array<{ id: string; ok: boolean }> = [
    { id: "first_case", ok: totalCases >= 1 },
    { id: "10_cases", ok: totalCases >= 10 },
    { id: "50_cases", ok: totalCases >= 50 },
    { id: "100_cases", ok: totalCases >= 100 },
    { id: "tdm_master", ok: (simulatorCounts["tdm"] || 0) >= 10 },
    { id: "prm_master", ok: (simulatorCounts["prm"] || 0) >= 10 },
    { id: "antimicrobial_master", ok: (simulatorCounts["antimicrobianos"] || 0) >= 10 },
    { id: "insulin_master", ok: (simulatorCounts["insulina"] || 0) >= 10 },
    { id: "streak_3", ok: streak >= 3 },
    { id: "streak_7", ok: streak >= 7 },
    { id: "streak_30", ok: streak >= 30 },
    { id: "points_500", ok: totalPoints >= 500 },
    { id: "points_2000", ok: totalPoints >= 2000 },
    { id: "versatile", ok: Object.keys(simulatorCounts).length >= 4 },
  ];

  const { data: existing } = await admin.from("user_badges")
    .select("badge_id").eq("user_id", userId);
  const have = new Set(((existing as any[]) || []).map((r) => r.badge_id));
  const toAdd = BADGE_RULES.filter((r) => r.ok && !have.has(r.id))
    .map((r) => ({ user_id: userId, badge_id: r.id }));
  if (toAdd.length) {
    await admin.from("user_badges").insert(toAdd as any);
  }

  return ok({ awarded: true, totalPoints, newBadges: toAdd.map((b) => b.badge_id) });
});
