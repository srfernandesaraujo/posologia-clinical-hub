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
  | { action: "find-or-create-participant"; room_id: string; name: string; email?: string | null; is_group: boolean; group_members?: any[] };

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
      // Strip pin from response (room.pin is what the user already typed, but no need to return).
      const { pin: _omit, ...safeRoom } = room as any;
      return ok({ room: safeRoom, activities: acts || [] });
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
      const name = String(body.name || "").trim();
      if (!name) return bad("Name required");
      const email = body.email ? String(body.email).toLowerCase().trim() : null;
      const isGroup = !!body.is_group;

      // Try to resume existing participant
      let q = supabase.from("room_participants").select("id")
        .eq("room_id", room.id).eq("is_group", isGroup);
      if (email) q = q.eq("participant_email", email);
      else q = q.ilike("participant_name", name);
      const { data: existing } = await q.order("joined_at", { ascending: true }).limit(1).maybeSingle();

      let participantId = existing?.id as string | undefined;
      if (!participantId) {
        const { data, error } = await supabase.from("room_participants").insert({
          room_id: room.id,
          participant_name: name,
          is_group: isGroup,
          group_members: body.group_members || [],
          participant_email: email,
        } as any).select("id").single();
        if (error || !data) throw error || new Error("insert failed");
        participantId = data.id;
      }

      // Compute resume index
      const { data: subs } = await supabase
        .from("room_submissions").select("activity_id")
        .eq("room_id", room.id).eq("participant_id", participantId);
      const submittedIds = new Set(((subs as any[]) || []).map((s) => s.activity_id).filter(Boolean));

      return ok({
        participantId,
        resumed: !!existing,
        submittedActivityIds: [...submittedIds],
      });
    }

    return bad("Unknown action");
  } catch (e) {
    console.error("room-access error", e);
    return bad("Internal error", 500);
  }
});
