import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { email: user.email });

    // Fast path: read the persisted status synced by stripe-webhook, no Stripe round-trip.
    const { data: cached } = await supabaseClient
      .from("subscribers")
      .select("status, plan, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    if (cached) {
      logStep("Serving from subscribers cache", cached);
      return new Response(
        JSON.stringify({
          subscribed: cached.status === "active",
          plan: cached.status === "active" ? "premium" : "free",
          subscription_end: cached.current_period_end,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Fallback: no cached row yet (e.g. subscribed before this table existed, or the
    // webhook hasn't landed). Ask Stripe directly and backfill subscribers for next time.
    logStep("No subscribers row, falling back to live Stripe check");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false, plan: "free" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      await supabaseClient.from("subscribers").upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        status: "none",
        plan: "free",
        current_period_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      logStep("No active subscription");
      return new Response(JSON.stringify({ subscribed: false, plan: "free" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const periodEnd = subscription.current_period_end;
    let subscriptionEnd: string;
    try {
      const endDate = typeof periodEnd === 'number' ? new Date(periodEnd * 1000) : new Date(periodEnd);
      if (isNaN(endDate.getTime())) throw new Error("Invalid date");
      subscriptionEnd = endDate.toISOString();
    } catch {
      subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      logStep("Could not parse subscription end, using fallback", { periodEnd });
    }
    const productId = subscription.items.data[0].price.product;
    logStep("Active subscription found", { productId, subscriptionEnd });

    await supabaseClient.from("subscribers").upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: "active",
      plan: "premium",
      current_period_end: subscriptionEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return new Response(
      JSON.stringify({
        subscribed: true,
        plan: "premium",
        product_id: productId,
        subscription_end: subscriptionEnd,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
