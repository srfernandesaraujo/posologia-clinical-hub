// Item 11 do roadmap: emite crédito de educação continuada por trilha (= categoria de
// simulador) concluída. Recalcula elegibilidade no servidor a partir de
// simulator_attempts — nunca confia em masteryPct/distinctSimulators vindo do client,
// mesmo raciocínio de getFullAccess() para o gate Premium. education_credits não tem
// policy de INSERT para authenticated (ver migration) — esta função (service role) é o
// único jeito de criar uma linha.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getFullAccess } from "../_shared/subscription.ts";
import { getSimulatorCategory, SIMULATOR_CATEGORIES } from "../_shared/simulatorCategories.ts";

const ALL_CATEGORIES = new Set(Object.values(SIMULATOR_CATEGORIES));

const HALF_LIFE_DAYS = 30;
const MIN_MASTERY_PCT = 70;
const MIN_DISTINCT_SIMULATORS = 3;
const MAX_CREDIT_HOURS = 8;
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sem 0/O/1/I (ambíguos)

const adminClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function bad(msg: string, status = 400, extra?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error: msg, ...extra }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateVerificationCode(): string {
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function daysBetween(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

type Body = { action: "issue"; category: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return bad("Não autenticado", 401);

  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (claimsError || !claimsData?.claims) return bad("Não autenticado", 401);
  const userId = claimsData.claims.sub as string;

  if (!(await getFullAccess(userId))) {
    return bad("Créditos de educação continuada são um recurso exclusivo do plano Premium.", 403);
  }

  let body: Body;
  try { body = await req.json(); } catch { return bad("Invalid JSON"); }
  if (!body || body.action !== "issue") return bad("Missing action");

  const category = String(body.category || "").trim();
  if (!ALL_CATEGORIES.has(category)) return bad("Categoria inválida");

  try {
    // Idempotente: se já emitido para esta trilha, devolve o existente.
    const { data: existing, error: existingError } = await adminClient
      .from("education_credits")
      .select("*")
      .eq("user_id", userId)
      .eq("track_category", category)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return ok({ issued: true, alreadyIssued: true, credit: existing });

    const { data: attempts, error: attemptsError } = await adminClient
      .from("simulator_attempts")
      .select("simulator_slug, score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (attemptsError) throw attemptsError;

    let weightedSum = 0;
    let weightTotal = 0;
    const distinctSlugs = new Set<string>();
    for (const a of attempts || []) {
      if (getSimulatorCategory(a.simulator_slug) !== category) continue;
      const weight = Math.pow(0.5, daysBetween(a.created_at) / HALF_LIFE_DAYS);
      weightedSum += a.score * weight;
      weightTotal += weight;
      distinctSlugs.add(a.simulator_slug);
    }
    const masteryPct = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;
    const distinctSimulators = distinctSlugs.size;

    if (masteryPct < MIN_MASTERY_PCT || distinctSimulators < MIN_DISTINCT_SIMULATORS) {
      return ok({
        issued: false,
        eligible: false,
        masteryPct,
        distinctSimulators,
        required: { masteryPct: MIN_MASTERY_PCT, distinctSimulators: MIN_DISTINCT_SIMULATORS },
      });
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .maybeSingle();

    const creditHours = Math.min(distinctSimulators, MAX_CREDIT_HOURS);
    const verificationCode = generateVerificationCode();

    const { data: inserted, error: insertError } = await adminClient
      .from("education_credits")
      .insert({
        user_id: userId,
        student_name: profile?.full_name || "Aluno(a)",
        track_category: category,
        mastery_pct: masteryPct,
        distinct_simulators: distinctSimulators,
        credit_hours: creditHours,
        verification_code: verificationCode,
      })
      .select("*")
      .single();
    if (insertError) throw insertError;

    return ok({ issued: true, alreadyIssued: false, credit: inserted });
  } catch (e) {
    console.error("education-credit-issue error", e);
    return bad("Internal error", 500);
  }
});
