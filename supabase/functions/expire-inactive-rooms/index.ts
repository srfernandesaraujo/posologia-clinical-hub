import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Find active rooms where:
    // 1. The last participant joined more than 7 days ago, OR
    // 2. No participants and room was created more than 7 days ago
    const { data: activeRooms, error: fetchErr } = await supabase
      .from("virtual_rooms")
      .select("id, created_at")
      .eq("is_active", true);

    if (fetchErr) throw fetchErr;

    const roomsToDeactivate: string[] = [];

    for (const room of activeRooms || []) {
      const { data: lastParticipant } = await supabase
        .from("room_participants")
        .select("joined_at")
        .eq("room_id", room.id)
        .order("joined_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastActivity = lastParticipant?.joined_at || room.created_at;
      if (new Date(lastActivity) < new Date(sevenDaysAgo)) {
        roomsToDeactivate.push(room.id);
      }
    }

    if (roomsToDeactivate.length > 0) {
      const { error: updateErr } = await supabase
        .from("virtual_rooms")
        .update({ is_active: false })
        .in("id", roomsToDeactivate);

      if (updateErr) throw updateErr;
    }

    return new Response(
      JSON.stringify({ deactivated: roomsToDeactivate.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
