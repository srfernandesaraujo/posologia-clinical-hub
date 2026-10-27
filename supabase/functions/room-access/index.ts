// Public edge function for unauthenticated student access to virtual rooms.
// Replaces direct anon SELECTs on virtual_rooms (PIN), room_authorized_emails,
// room_participants and class_students.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type Body =
  | { action: "lookup"; pin: string }
  | { action: "validate-emails"; room_id: string; emails: string[] }
  | { action: "check-group-membership"; room_id: string; email: string }
  | { action: "find-or-create-participant"; room_id: string; name: string; email?: string | null; is_group: boolean; group_members?: any[]; member_key?: string; member_name?: string }
  | { action: "group-sync"; participant_id: string; activity_id: string; member_id: string; member_name?: string }
  | { action: "group-push"; participant_id: string; activity_id: string; member_id: string; state: Record<string, unknown> }
  | { action: "group-claim"; participant_id: string; member_id: string; member_name?: string }
  | { action: "group-pass"; participant_id: string; member_id: string; to_member_id: string };

// Sem sinal do líder por tanto tempo, qualquer observador pode assumir a liderança.
const LEADER_STALE_MS = 90_000;
// Presente = pingou nos últimos 20s (o cliente sincroniza a cada ~3s).
const PRESENT_MS = 20_000;

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

async function getActiveRoom(idOrPin: { id?: string; pin?: string }) {
  let q = supabase.from("virtual_rooms").select("*").eq("is_active", true).limit(1);
  if (idOrPin.id) q = q.eq("id", idOrPin.id);
  if (idOrPin.pin) q = q.eq("pin", idOrPin.pin);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data;
}

async function groupView(participantId: string) {
  const { data: part } = await supabase
    .from("room_participants")
    .select("leader_member_id, leader_member_name, leader_seen_at")
    .eq("id", participantId).maybeSingle();
  const { data: mems } = await supabase
    .from("room_group_members")
    .select("member_id, member_name, last_seen_at")
    .eq("participant_id", participantId)
    .order("joined_at", { ascending: true });
  const now = Date.now();
  const leaderSeen = (part as any)?.leader_seen_at ? new Date((part as any).leader_seen_at).getTime() : 0;
  return {
    leaderId: (part as any)?.leader_member_id ?? null,
    leaderName: (part as any)?.leader_member_name ?? null,
    leaderStale: !!(part as any)?.leader_member_id && now - leaderSeen > LEADER_STALE_MS,
    members: ((mems as any[]) || []).map((m) => ({
      id: m.member_id as string,
      name: m.member_name as string,
      online: now - new Date(m.last_seen_at).getTime() < PRESENT_MS,
    })),
  };
}

async function touchMember(participantId: string, memberId: string, memberName?: string) {
  const nowIso = new Date().toISOString();
  const { data: existing } = await supabase
    .from("room_group_members").select("member_name")
    .eq("participant_id", participantId).eq("member_id", memberId).maybeSingle();
  if (existing) {
    const patch: Record<string, unknown> = { last_seen_at: nowIso };
    if (memberName) patch.member_name = memberName;
    await supabase.from("room_group_members").update(patch)
      .eq("participant_id", participantId).eq("member_id", memberId);
  } else {
    await supabase.from("room_group_members").upsert({
      participant_id: participantId, member_id: memberId, member_name: memberName || memberId, last_seen_at: nowIso,
    } as any, { onConflict: "participant_id,member_id", ignoreDuplicates: true });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  let body: Body;
  try { body = await req.json(); } catch { return bad("Invalid JSON"); }
  if (!body || !("action" in body)) return bad("Missing action");

  try {
    if (body.action === "lookup") {
      const pin = String(body.pin || "").trim();
      if (!/^\d{6}$/.test(pin)) return bad("Invalid PIN");
      const room = await getActiveRoom({ pin });
      if (!room) return ok({ room: null, activities: [] });
      if (room.expires_at && new Date(room.expires_at) < new Date()) {
        return ok({ room: null, activities: [], expired: true });
      }
      const { data: acts } = await supabase
        .from("room_activities").select("*").eq("room_id", room.id).order("position");
      const { count: assignedCount } = await supabase
        .from("room_authorized_emails")
        .select("id", { count: "exact", head: true })
        .eq("room_id", room.id)
        .not("assigned_activity_id", "is", null);
      // Strip pin from response (room.pin is what the user already typed, but no need to return).
      const { pin: _omit, ...safeRoom } = room as any;
      return ok({ room: safeRoom, activities: acts || [], hasGroupAssignments: (assignedCount || 0) > 0 });
    }

    if (body.action === "validate-emails") {
      const room = await getActiveRoom({ id: body.room_id });
      if (!room) return bad("Room not found", 404);
      const emails = (body.emails || []).map((e) => String(e).toLowerCase().trim()).filter(Boolean);
      if (emails.length === 0) return ok({ authorized: [], unauthorized: [] });
      const { data, error } = await supabase
        .from("room_authorized_emails").select("email").eq("room_id", room.id).in("email", emails);
      if (error) throw error;
      const authSet = new Set(((data as any[]) || []).map((a) => String(a.email).toLowerCase()));
      const unauthorized = emails.filter((e) => !authSet.has(e));
      return ok({ authorized: [...authSet], unauthorized });
    }

    if (body.action === "check-group-membership") {
      const room = await getActiveRoom({ id: body.room_id });
      if (!room) return bad("Room not found", 404);
      const email = String(body.email || "").toLowerCase().trim();
      if (!email) return ok({ inAnyGroup: false });
      const { data, error } = await supabase
        .from("room_participants").select("group_members, participant_email")
        .eq("room_id", room.id).eq("is_group", true);
      if (error) throw error;
      const inAnyGroup = ((data as any[]) || []).some((p) => {
        if ((p.participant_email || "").toLowerCase() === email) return true;
        const gm = p.group_members;
        if (!Array.isArray(gm)) return false;
        return gm.some((m: any) => typeof m === "object" && m?.email && String(m.email).toLowerCase() === email);
      });
      return ok({ inAnyGroup });
    }

    if (body.action === "find-or-create-participant") {
      const room = await getActiveRoom({ id: body.room_id });
      if (!room) return bad("Room not found", 404);
      let name = String(body.name || "").trim();
      const email = body.email ? String(body.email).toLowerCase().trim() : null;
      let isGroup = !!body.is_group;
      let groupMembers: any[] = body.group_members || [];
      let assignedActivityId: string | null = null;
      let memberDisplayName: string | null = body.member_name ? String(body.member_name).trim() : null;

      // Professor-assigned group: the authorized email carries an assigned_activity_id,
      // which overrides whatever the client sent (name/is_group/group_members) so every
      // member of the group converges on the same room_participants row and case.
      if (email) {
        const { data: authRow } = await supabase
          .from("room_authorized_emails")
          .select("assigned_activity_id")
          .eq("room_id", room.id).eq("email", email).maybeSingle();
        if (authRow?.assigned_activity_id) {
          assignedActivityId = authRow.assigned_activity_id;
          const { data: activity } = await supabase
            .from("room_activities").select("id, position, group_label")
            .eq("id", assignedActivityId).maybeSingle();
          const { data: groupmates } = await supabase
            .from("room_authorized_emails")
            .select("student_name, email")
            .eq("room_id", room.id).eq("assigned_activity_id", assignedActivityId);

          name = activity?.group_label || `Grupo ${(activity?.position ?? 0) + 1}`;
          isGroup = true;
          groupMembers = ((groupmates as any[]) || []).map((m) => ({ name: m.student_name, email: m.email }));
          const me = ((groupmates as any[]) || []).find((m) => String(m.email).toLowerCase() === email);
          memberDisplayName = me?.student_name || memberDisplayName;
        }
      }

      if (!name) return bad("Name required");

      // Try to resume existing participant
      let q = supabase.from("room_participants").select("id")
        .eq("room_id", room.id).eq("is_group", isGroup);
      if (assignedActivityId) q = q.ilike("participant_name", name);
      else if (email) q = q.eq("participant_email", email);
      else q = q.ilike("participant_name", name);
      const { data: existing } = await q.order("joined_at", { ascending: true }).limit(1).maybeSingle();

      let participantId = existing?.id as string | undefined;
      if (!participantId) {
        const { data, error } = await supabase.from("room_participants").insert({
          room_id: room.id,
          participant_name: name,
          is_group: isGroup,
          group_members: groupMembers,
          participant_email: assignedActivityId ? null : email,
          assigned_activity_id: assignedActivityId,
        } as any).select("id").single();
        if (error || !data) throw error || new Error("insert failed");
        participantId = data.id;
      } else if (assignedActivityId) {
        await supabase.from("room_participants").update({ assigned_activity_id: assignedActivityId } as any).eq("id", participantId);
      }

      // Compute resume index
      // No modo "todos respondem" cada membro tem o próprio progresso: só conta o que ele enviou.
      const collectiveMemberId = assignedActivityId && (room as any).group_mode === "collective"
        ? (email || (body.member_key ? String(body.member_key).trim() : ""))
        : "";
      const { data: subs } = await supabase
        .from("room_submissions").select("activity_id, member_id:actions->member->>id")
        .eq("room_id", room.id).eq("participant_id", participantId);
      const submittedIds = new Set(
        ((subs as any[]) || [])
          .filter((s) => !collectiveMemberId || s.member_id === collectiveMemberId)
          .map((s) => s.activity_id).filter(Boolean),
      );

      // Papéis dentro do grupo (só em grupos atribuídos pelo professor, onde todos convergem
      // na mesma linha de participante). Líder = primeiro a entrar; demais = observadores.
      const groupMode: "leader" | "collective" = (room as any).group_mode === "collective" ? "collective" : "leader";
      let group: null | Record<string, unknown> = null;
      const memberId = email || (body.member_key ? String(body.member_key).trim() : "");
      if (assignedActivityId && memberId) {
        const memberName = memberDisplayName || name;
        await touchMember(participantId!, memberId, memberName);
        if (groupMode === "leader") {
          // Atômico: só quem encontrar leader_member_id nulo vira líder.
          await supabase.from("room_participants")
            .update({ leader_member_id: memberId, leader_member_name: memberName, leader_seen_at: new Date().toISOString() } as any)
            .eq("id", participantId!).is("leader_member_id", null);
        }
        const view = await groupView(participantId!);
        const role = groupMode === "collective" ? "collective" : view.leaderId === memberId ? "leader" : "observer";
        group = { mode: groupMode, memberId, memberName, role, ...view };
      }

      return ok({
        participantId,
        resumed: !!existing,
        submittedActivityIds: [...submittedIds],
        assignedActivityId,
        group,
      });
    }

    if (body.action === "group-sync") {
      const memberId = String(body.member_id || "");
      if (!body.participant_id || !body.activity_id || !memberId) return bad("Missing fields");
      await touchMember(body.participant_id, memberId, body.member_name);
      const view = await groupView(body.participant_id);
      if (view.leaderId === memberId) {
        await supabase.from("room_participants")
          .update({ leader_seen_at: new Date().toISOString() } as any).eq("id", body.participant_id);
      }
      const { data: st } = await supabase
        .from("room_group_state").select("state, updated_at")
        .eq("participant_id", body.participant_id).eq("activity_id", body.activity_id).maybeSingle();
      return ok({ ...view, state: (st as any)?.state ?? null, stateUpdatedAt: (st as any)?.updated_at ?? null });
    }

    if (body.action === "group-push") {
      const view = await groupView(body.participant_id);
      if (!view.leaderId || view.leaderId !== body.member_id) return bad("Not the group leader", 403);
      const { error } = await supabase.from("room_group_state").upsert({
        participant_id: body.participant_id,
        activity_id: body.activity_id,
        state: body.state,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "participant_id,activity_id" });
      if (error) throw error;
      return ok({ ok: true });
    }

    if (body.action === "group-claim") {
      // Observador assume a liderança só se o líder atual sumiu (sem sinal há LEADER_STALE_MS).
      const view = await groupView(body.participant_id);
      if (view.leaderId === body.member_id) return ok({ claimed: true, ...view });
      if (view.leaderId && !view.leaderStale) return ok({ claimed: false, ...view });
      const mem = view.members.find((m) => m.id === body.member_id);
      await supabase.from("room_participants").update({
        leader_member_id: body.member_id,
        leader_member_name: body.member_name || mem?.name || body.member_id,
        leader_seen_at: new Date().toISOString(),
      } as any).eq("id", body.participant_id);
      return ok({ claimed: true, ...(await groupView(body.participant_id)) });
    }

    if (body.action === "group-pass") {
      // O líder passa o bastão para um colega do grupo.
      const view = await groupView(body.participant_id);
      if (view.leaderId !== body.member_id) return bad("Not the group leader", 403);
      const target = view.members.find((m) => m.id === body.to_member_id);
      if (!target) return bad("Member not found", 404);
      await supabase.from("room_participants").update({
        leader_member_id: target.id,
        leader_member_name: target.name,
        leader_seen_at: new Date().toISOString(),
      } as any).eq("id", body.participant_id);
      return ok({ ...(await groupView(body.participant_id)) });
    }

    return bad("Unknown action");
  } catch (e) {
    console.error("room-access error", e);
    return bad("Internal error", 500);
  }
});
