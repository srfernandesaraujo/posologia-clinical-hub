import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Server-side daily cap for voice-related AI calls (STT, LLM turn, eval) —
 * the first real cost enforcement in the codebase; see
 * supabase/migrations/20260802100000_voice_usage_daily.sql for why a
 * dedicated table exists instead of counting rows in ai_usage_log.
 */
export const DAILY_VOICE_TURN_CAP = 15;

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}

/** Increments today's turn count and throws (with "429" in the message) if it exceeds the daily cap. */
export async function checkAndIncrementVoiceUsage(userId: string): Promise<void> {
  const supabase = adminClient();
  const { data: newCount, error } = await supabase.rpc("increment_voice_usage_turn", { p_user_id: userId });

  if (error) {
    throw new Error(`Falha ao verificar limite de uso de voz: ${error.message}`);
  }

  if ((newCount ?? 0) > DAILY_VOICE_TURN_CAP) {
    // Compensate the increment so the count doesn't drift past the cap on repeated rejected attempts.
    await supabase.rpc("decrement_voice_usage_turn", { p_user_id: userId });
    throw new Error(
      `429: Você atingiu o limite diário de ${DAILY_VOICE_TURN_CAP} turnos de voz. Volte amanhã para continuar praticando.`
    );
  }
}

/** Read-only check — used by legs of a turn that were already counted by an earlier leg (e.g. the LLM turn after STT already incremented). */
export async function peekVoiceUsage(userId: string): Promise<{ count: number; cap: number }> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("voice_usage_daily")
    .select("turns_count")
    .eq("user_id", userId)
    .eq("usage_date", new Date().toISOString().slice(0, 10))
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao verificar limite de uso de voz: ${error.message}`);
  }

  const count = data?.turns_count ?? 0;
  if (count > DAILY_VOICE_TURN_CAP) {
    throw new Error(
      `429: Você atingiu o limite diário de ${DAILY_VOICE_TURN_CAP} turnos de voz. Volte amanhã para continuar praticando.`
    );
  }
  return { count, cap: DAILY_VOICE_TURN_CAP };
}
