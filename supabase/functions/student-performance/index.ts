import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Called by an external system (a WhatsApp AI-agent platform, wp.agents) to
// let a "performance consultant" agent look up a student's own results by
// e-mail and explain what they got wrong. There is no persistent "student"
// record in this schema — a student's e-mail can appear as
// room_participants.participant_email (solo or group leader) or inside a
// group's group_members JSONB array (see src/lib/participantMatching.ts,
// which this mirrors) — so both sources are searched and merged.
//
// Auth: shared-secret key, same pattern as hub-metrics/send-metrics-to-hub
// (header x-wpagents-key checked against the WPAGENTS_API_KEY secret).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-wpagents-key",
};

const MAX_ACTIVITIES = 15;
// Bounds the group_members scan below to recent joins, so it doesn't grow
// unbounded as rooms accumulate over semesters/years.
const GROUP_SCAN_SINCE_DAYS = 365;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
    if (!email && req.method === "POST") {
      try {
        const body = await req.json();
        email = body?.email ?? null;
      } catch {
        // no/invalid JSON body — email stays null, handled below
      }
    }
    email = (email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return json({ error: "Parâmetro 'email' ausente ou inválido." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
      return json({ aluno_email: email, encontrado: false, atividades: [] });
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
      return json({ aluno_email: email, encontrado: true, atividades: [] });
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

    return json({ aluno_email: email, encontrado: true, atividades });
  } catch (err) {
    console.error("student-performance error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
