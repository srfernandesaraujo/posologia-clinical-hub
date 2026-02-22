import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { share_token } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the share record
    const { data: share, error: shareErr } = await supabase
      .from("shared_tools")
      .select("*, tools(*)")
      .eq("share_token", share_token)
      .eq("is_active", true)
      .single();

    if (shareErr || !share) {
      return new Response(JSON.stringify({ active: false, reason: "not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin or has unlimited access
    const { data: profile } = await supabase
      .from("profiles")
      .select("has_unlimited_access")
      .eq("user_id", share.user_id)
      .single();

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", share.user_id)
      .eq("role", "admin")
      .maybeSingle();

    if (profile?.has_unlimited_access || adminRole) {
      return new Response(JSON.stringify({ active: true, tool: share.tools }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check Stripe subscription
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });

    const { data: authUser } = await supabase.auth.admin.getUserById(share.user_id);
    if (!authUser?.user?.email) {
      // Can't verify — deactivate
      await supabase.from("shared_tools").update({ is_active: false }).eq("id", share.id);
      return new Response(JSON.stringify({ active: false, reason: "no_user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customers = await stripe.customers.list({ email: authUser.user.email, limit: 1 });
    if (customers.data.length === 0) {
      await supabase.from("shared_tools").update({ is_active: false }).eq("id", share.id);
      return new Response(JSON.stringify({ active: false, reason: "no_subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      // No active subscription — deactivate the share
      await supabase.from("shared_tools").update({ is_active: false }).eq("id", share.id);
      return new Response(JSON.stringify({ active: false, reason: "no_subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ active: true, tool: share.tools }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
