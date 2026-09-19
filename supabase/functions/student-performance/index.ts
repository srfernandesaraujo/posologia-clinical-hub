import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@6";

// Called by an external system (a WhatsApp AI-agent platform, wp.agents) to
// let a "performance consultant" agent look up a student's own results by
// e-mail and explain what they got wrong.
//
// Two-step flow, to stop a classmate from reading someone else's grades by
// just typing their e-mail (there's no other identity check on the WhatsApp
// side — the agent only knows what the conversation tells it):
//   1. Called with only `email` -> generates a 6-digit code, e-mails it to
//      that address, returns {status:"code_sent"}. The agent is expected to
//      ask the student for the code they received.
//   2. Called with `email` + `code` -> validates the code (correct, not
//      expired, not already used, capped attempts) and only then returns
//      the actual results.
//
// There is no persistent "student" record in this schema — a student's
// e-mail can appear as room_participants.participant_email (solo or group
// leader) or inside a group's group_members JSONB array (see
// src/lib/participantMatching.ts, which this mirrors) — so both sources are
// searched and merged.
//
// Auth (of the calling system, not the student): shared-secret key, same
// pattern as hub-metrics/send-metrics-to-hub (header x-wpagents-key checked
// against the WPAGENTS_API_KEY secret).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-wpagents-key",
};

const MAX_ACTIVITIES = 15;
// Bounds the group_members scan below to recent joins, so it doesn't grow
// unbounded as rooms accumulate over semesters/years.
const GROUP_SCAN_SINCE_DAYS = 365;

const CODE_TTL_MINUTES = 10;
const MAX_CODE_REQUESTS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const FROM_EMAIL = "Posologia <noreply@tbl.posologia.app>";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendVerificationEmail(email: string, code: string) {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: "Seu código de verificação — Consultor de Desempenho",
    html: `
      <p>Olá!</p>
      <p>Alguém (esperamos que você 😊) pediu para consultar seu desempenho recente pelo assistente no WhatsApp.</p>
      <p>Seu código de verificação é:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p>Ele expira em ${CODE_TTL_MINUTES} minutos. Se você não pediu isso, pode ignorar este e-mail.</p>
    `,
  });
  if (error) throw new Error(typeof error === "string" ? error : error.message || "Falha ao enviar e-mail");
}

async function findStudentPerformance(supabase: any, email: string) {
  // Direct matches: the participant themselves (solo) or the group leader
  // registered this e-mail directly. ilike is only a DB-side pre-filter —
  // "_"/"%" in the e-mail are LIKE wildcards, so every candidate is
  // re-checked below with a strict, case-insensitive equality compare.
  const { data: directCandidates, error: directErr } = await supabase
    .from("room_participants")
    .select("id, room_id, participant_name, is_group, joined_at, participant_email")
    .not("participant_email", "is", null)
    .ilike("participant_email", email);
  if (directErr) throw directErr;
  const directMatches = (directCandidates || []).filter(
    (row: any) => (row.participant_email || "").trim().toLowerCase() === email
  );

  // Group-member matches: the e-mail only appears inside group_members
  // JSONB (case-insensitive match done here in JS, since Postgres jsonb
  // containment via PostgREST is exact-match/case-sensitive).
  const since = new Date(Date.now() - GROUP_SCAN_SINCE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: groupRows, error: groupErr } = await supabase
    .from("room_participants")
    .select("id, room_id, participant_name, is_group, joined_at, group_members")
    .eq("is_group", true)
    .gte("joined_at", since);
  if (groupErr) throw groupErr;

  const groupMatches = (groupRows || []).filter((row: any) =>
    Array.isArray(row.group_members) &&
    row.group_members.some((m: any) => {
      const memberEmail = typeof m === "string" ? null : m?.email;
      return typeof memberEmail === "string" && memberEmail.trim().toLowerCase() === email;
    })
  );

  const participantsById = new Map<string, any>();
  [...(directMatches || []), ...groupMatches].forEach((p: any) => participantsById.set(p.id, p));

  if (participantsById.size === 0) {
    return { aluno_email: email, encontrado: false, atividades: [] };
  }

  const participantIds = Array.from(participantsById.keys());

  const { data: submissions, error: subErr } = await supabase
    .from("room_submissions")
    .select("id, room_id, participant_id, score, actions, submitted_at")
    .in("participant_id", participantIds)
    .order("submitted_at", { ascending: false })
    .limit(MAX_ACTIVITIES);
  if (subErr) throw subErr;

  if (!submissions || submissions.length === 0) {
    return { aluno_email: email, encontrado: true, atividades: [] };
  }

  const roomIds = Array.from(new Set(submissions.map((s: any) => s.room_id)));
  const { data: rooms, error: roomsErr } = await supabase
    .from("virtual_rooms")
    .select("id, title")
    .in("id", roomIds);
  if (roomsErr) throw roomsErr;
  const roomTitleById = new Map((rooms || []).map((r: any) => [r.id, r.title]));

  const atividades = submissions.map((sub: any) => {
    const participant = participantsById.get(sub.participant_id);
    const base = {
      sala: roomTitleById.get(sub.room_id) || "Sala",
      data: sub.submitted_at,
      pontuacao: sub.score ?? null,
      grupo: participant?.is_group ? participant.participant_name : null,
    };

    if (sub.actions?.type === "challenge_results" && Array.isArray(sub.actions.questions)) {
      const questions = sub.actions.questions;
      const acertos = questions.filter((q: any) => q.correct).length;
      return {
        ...base,
        total_questoes: questions.length,
        acertos,
        questoes_erradas: questions
          .filter((q: any) => !q.correct)
          .map((q: any) => ({
            pergunta: q.question,
            resposta_do_aluno: q.userAnswer,
            resposta_correta: q.correctAnswer,
            explicacao: q.explanation || null,
            referencia: q.reference || null,
          })),
      };
    }

    return { ...base, tipo: "atividade" };
  });

  return { aluno_email: email, encontrado: true, atividades };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expectedKey = Deno.env.get("WPAGENTS_API_KEY");
    const providedKey = req.headers.get("x-wpagents-key");
    if (!expectedKey || providedKey !== expectedKey) {
      return json({ error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    let email = url.searchParams.get("email");
    let code = url.searchParams.get("code");
    if (!email && req.method === "POST") {
      try {
        const body = await req.json();
        email = body?.email ?? null;
        code = body?.code ?? code;
      } catch {
        // no/invalid JSON body — email stays null, handled below
      }
    }
    email = (email || "").trim().toLowerCase();
    code = (code || "").trim();

    if (!email || !email.includes("@")) {
      return json({ error: "Parâmetro 'email' ausente ou inválido." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Step 2: a code was provided — verify it, then return results ──
    if (code) {
      const { data: pending, error: codeErr } = await supabase
        .from("wpagents_verification_codes")
        .select("id, code, expires_at, consumed_at, attempts")
        .ilike("email", email)
        .is("consumed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (codeErr) throw codeErr;

      if (!pending || new Date(pending.expires_at) < new Date()) {
        return json({
          status: "invalid_code",
          mensagem: "Não há um código válido para esse e-mail (expirado ou nunca solicitado). Peça um novo código.",
        });
      }
      if (pending.attempts >= MAX_VERIFY_ATTEMPTS) {
        return json({
          status: "too_many_attempts",
          mensagem: "Esse código foi tentado várias vezes sem sucesso. Peça um novo código.",
        });
      }
      if (pending.code !== code) {
        await supabase
          .from("wpagents_verification_codes")
          .update({ attempts: pending.attempts + 1 })
          .eq("id", pending.id);
        return json({
          status: "wrong_code",
          mensagem: "Código incorreto. Confirme o código recebido por e-mail e tente novamente.",
        });
      }

      // Correct — single-use, mark consumed so it can't be replayed.
      await supabase
        .from("wpagents_verification_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", pending.id);

      const result = await findStudentPerformance(supabase, email);
      return json({ status: "verified", ...result });
    }

    // ── Step 1: no code yet — rate-limit, generate one, e-mail it ──
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount, error: countErr } = await supabase
      .from("wpagents_verification_codes")
      .select("id", { count: "exact", head: true })
      .ilike("email", email)
      .gte("created_at", since);
    if (countErr) throw countErr;
    if ((recentCount || 0) >= MAX_CODE_REQUESTS_PER_HOUR) {
      return json({
        status: "rate_limited",
        mensagem: "Muitos códigos pedidos recentemente para esse e-mail. Peça para tentar novamente em uma hora.",
      });
    }

    const newCode = generateCode();
    const { error: insertErr } = await supabase.from("wpagents_verification_codes").insert({
      email,
      code: newCode,
      expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString(),
    });
    if (insertErr) throw insertErr;

    await sendVerificationEmail(email, newCode);

    return json({
      status: "code_sent",
      mensagem: `Um código de verificação foi enviado para ${email}. Peça ao aluno o código de 6 dígitos recebido, e chame esta mesma ferramenta de novo com o e-mail e o código.`,
    });
  } catch (err) {
    console.error("student-performance error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
