// Public edge function for unauthenticated student access to live team-case sessions
// (item 04 do roadmap — Salas Virtuais ao vivo). Mirrors room-access/index.ts: students are
// anonymous (no auth.users row), so writes to live_session_participants/live_session_events
// go through here with the service role instead of direct anon RLS inserts. Professor actions
// (start/inject-event/end) are authenticated and go straight through RLS-protected tables
// from the client — see SalaAoVivo.tsx.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type Body =
  | { action: "get-or-create-session"; room_id: string; activity_id: string; case_key: string }
  | { action: "join-role"; session_id: string; participant_id: string; role: string }
  | { action: "submit-action"; session_id: string; participant_id: string; role: string; payload: Record<string, unknown> }
  | { action: "leave"; session_id: string; participant_id: string };

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

async function getSession(sessionId: string) {
  const { data, error } = await supabase
    .from("live_sessions" as any)
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data as any;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  let body: Body;
  try { body = await req.json(); } catch { return bad("Invalid JSON"); }
  if (!body || !("action" in body)) return bad("Missing action");

  try {
    if (body.action === "get-or-create-session") {
      const { data: existing } = await supabase
        .from("live_sessions" as any)
        .select("*")
        .eq("room_id", body.room_id)
        .eq("activity_id", body.activity_id)
        .neq("status", "ended")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) return ok({ session: existing });

      const { data: room } = await supabase.from("virtual_rooms").select("created_by").eq("id", body.room_id).maybeSingle();
      if (!room) return bad("Sala não encontrada", 404);

      const { data: created, error } = await supabase
        .from("live_sessions" as any)
        .insert({ room_id: body.room_id, activity_id: body.activity_id, case_key: body.case_key, created_by: (room as any).created_by })
        .select("*")
        .single();
      if (error) throw error;
      return ok({ session: created });
    }

    if (body.action === "join-role") {
      const session = await getSession(body.session_id);
      if (!session) return bad("Sessão não encontrada", 404);
      if (session.status === "ended") return bad("Esta sessão já foi encerrada", 409);
      const role = String(body.role || "").trim();
      if (!role) return bad("Papel obrigatório");

      // Idempotente: se esse participante já está na sessão, devolve o papel que ele já tem.
      const { data: existing } = await supabase
        .from("live_session_participants" as any)
        .select("*")
        .eq("session_id", body.session_id)
        .eq("participant_id", body.participant_id)
        .maybeSingle();
      if (existing) return ok({ participant: existing });

      const { data, error } = await supabase
        .from("live_session_participants" as any)
        .insert({ session_id: body.session_id, participant_id: body.participant_id, role })
        .select("*")
        .single();
      if (error) {
        // unique_violation (papel já ocupado por outra pessoa, corrida entre duas abas)
        if ((error as any).code === "23505") return bad("Esse papel já foi escolhido por outra pessoa", 409);
        throw error;
      }
      return ok({ participant: data });
    }

    if (body.action === "submit-action") {
      const session = await getSession(body.session_id);
      if (!session) return bad("Sessão não encontrada", 404);
      if (session.status !== "active") return bad("A sessão não está ativa", 409);

      const { data: participant } = await supabase
        .from("live_session_participants" as any)
        .select("*")
        .eq("session_id", body.session_id)
        .eq("participant_id", body.participant_id)
        .eq("role", body.role)
        .maybeSingle();
      if (!participant) return bad("Você não está nesse papel nesta sessão", 403);

      const { data, error } = await supabase
        .from("live_session_events" as any)
        .insert({
          session_id: body.session_id,
          actor_participant_id: body.participant_id,
          role: body.role,
          event_type: "action",
          payload: body.payload || {},
        })
        .select("*")
        .single();
      if (error) throw error;
      return ok({ event: data });
    }

    if (body.action === "leave") {
      const { error } = await supabase
        .from("live_session_participants" as any)
        .delete()
        .eq("session_id", body.session_id)
        .eq("participant_id", body.participant_id);
      if (error) throw error;
      return ok({ left: true });
    }

    return bad("Unknown action");
  } catch (e) {
    console.error("live-session-access error", e);
    return bad("Internal error", 500);
  }
});
