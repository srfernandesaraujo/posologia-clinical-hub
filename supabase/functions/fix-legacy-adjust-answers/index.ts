import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// One-off cleanup for the "adjust" question bug fixed in
// SimulatorChallengeMode.tsx (2026-09-19): when a hybrid adjust+MCQ
// challenge has no simple targetParams range, a wrong "adjust" verdict used
// to leave userAnswer === correctAnswer (both collapsing to just the
// "| Alternativa: X" suffix) — misleading, since the question really was
// wrong, just not for a reason visible in that identical text.
//
// The original validator feedback that explained *why* was never stored for
// those old rows, so it can't be reconstructed — this only replaces the
// misleading identical pair with an explicit "not available" note.
//
// Safe by default: runs as a dry run (reports what it WOULD change) unless
// called with ?apply=true. Re-running after apply is a no-op (already-fixed
// rows no longer match the bug signature).
//
// Usage:
//   curl -H "x-wpagents-key: <key>" ".../fix-legacy-adjust-answers"             # dry run
//   curl -H "x-wpagents-key: <key>" ".../fix-legacy-adjust-answers?apply=true"  # apply for real

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-wpagents-key",
};

const PLACEHOLDER =
  "[detalhe indisponível — resposta registrada antes de uma correção no sistema; a questão foi marcada como errada com base na configuração do simulador no momento]";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const expectedKey = Deno.env.get("WPAGENTS_API_KEY");
    const providedKey = req.headers.get("x-wpagents-key");
    if (!expectedKey || providedKey !== expectedKey) {
      return json({ error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    const apply = url.searchParams.get("apply") === "true";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: rows, error } = await supabase
      .from("room_submissions")
      .select("id, actions")
      .eq("actions->>type", "challenge_results");
    if (error) throw error;

    const report: any[] = [];
    let totalQuestionsFixed = 0;

    for (const row of rows || []) {
      const questions = row.actions?.questions;
      if (!Array.isArray(questions)) continue;

      let changed = false;
      const fixedQuestions = questions.map((q: any) => {
        const isBugged =
          q &&
          q.correct === false &&
          typeof q.userAnswer === "string" &&
          typeof q.correctAnswer === "string" &&
          q.userAnswer.trim() !== "" &&
          q.userAnswer !== PLACEHOLDER &&
          q.userAnswer === q.correctAnswer;

        if (!isBugged) return q;
        changed = true;
        totalQuestionsFixed++;
        return { ...q, userAnswer: PLACEHOLDER, correctAnswer: PLACEHOLDER };
      });

      if (!changed) continue;

      report.push({
        submission_id: row.id,
        questions_fixed: fixedQuestions.filter((q: any, i: number) => q !== questions[i]).length,
      });

      if (apply) {
        const { error: updateErr } = await supabase
          .from("room_submissions")
          .update({ actions: { ...row.actions, questions: fixedQuestions } })
          .eq("id", row.id);
        if (updateErr) throw updateErr;
      }
    }

    return json({
      mode: apply ? "applied" : "dry_run",
      submissions_scanned: (rows || []).length,
      submissions_affected: report.length,
      questions_fixed: totalQuestionsFixed,
      details: report,
    });
  } catch (err) {
    console.error("fix-legacy-adjust-answers error:", err);
    return json({ error: "Internal server error", message: String((err as Error)?.message || err) }, 500);
  }
});
