// Public edge function for unauthenticated education-credit verification (item 11).
// education_credits has no public SELECT policy (it holds student names) — this
// service-role function is the only way to look up a credit by its code, same pattern
// as certificate-verify (item 10, OSCE) / room-access.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type Body = { action: "verify"; code: string };

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CODE_RE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  let body: Body;
  try { body = await req.json(); } catch { return bad("Invalid JSON"); }
  if (!body || body.action !== "verify") return bad("Missing action");

  const code = String(body.code || "").trim().toUpperCase();
  if (!CODE_RE.test(code)) return ok({ found: false });

  try {
    const { data, error } = await supabase
      .from("education_credits")
      .select("student_name, track_category, mastery_pct, distinct_simulators, credit_hours, issued_at, revoked_at")
      .eq("verification_code", code)
      .maybeSingle();
    if (error) throw error;
    if (!data) return ok({ found: false });

    return ok({
      found: true,
      revoked: !!data.revoked_at,
      student_name: data.student_name,
      track_category: data.track_category,
      mastery_pct: data.mastery_pct,
      distinct_simulators: data.distinct_simulators,
      credit_hours: data.credit_hours,
      issued_at: data.issued_at,
    });
  } catch (e) {
    console.error("education-credit-verify error", e);
    return bad("Internal error", 500);
  }
});
