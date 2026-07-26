import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// No CORS headers here on purpose: this endpoint is only ever called
// server-to-server by Stripe, never from the browser.

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

async function resolveUserId(
  supabaseAdmin: ReturnType<typeof createClient>,
  opts: { clientReferenceId?: string | null; metadataUserId?: string | null; customerEmail?: string | null }
): Promise<string | null> {
  if (opts.clientReferenceId) return opts.clientReferenceId;
  if (opts.metadataUserId) return opts.metadataUserId;
  if (opts.customerEmail) {
    const { data } = await supabaseAdmin.rpc("get_user_id_by_email", { _email: opts.customerEmail });
    if (data) return data as string;
  }
  return null;
}

serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return new Response("Server misconfigured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("Missing stripe-signature header");
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    logStep("Signature verification failed", { message: err instanceof Error ? err.message : String(err) });
    return new Response("Invalid signature", { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;

        const userId = await resolveUserId(supabaseAdmin, {
          clientReferenceId: session.client_reference_id,
          customerEmail: session.customer_details?.email ?? session.customer_email,
        });
        if (!userId) {
          logStep("checkout.session.completed: could not resolve user", { sessionId: session.id });
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await upsertSubscriber(supabaseAdmin, userId, subscription);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(supabaseAdmin, {
          metadataUserId: subscription.metadata?.supabase_user_id,
        }) ?? await resolveUserIdByCustomer(supabaseAdmin, stripe, subscription.customer as string);
        if (!userId) {
          logStep("subscription event: could not resolve user", { subscriptionId: subscription.id });
          break;
        }
        await upsertSubscriber(supabaseAdmin, userId, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(supabaseAdmin, {
          metadataUserId: subscription.metadata?.supabase_user_id,
        }) ?? await resolveUserIdByCustomer(supabaseAdmin, stripe, subscription.customer as string);
        if (!userId) {
          logStep("subscription.deleted: could not resolve user", { subscriptionId: subscription.id });
          break;
        }
        await supabaseAdmin.from("subscribers").upsert({
          user_id: userId,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          status: "canceled",
          plan: "free",
          current_period_end: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    logStep("ERROR", { message: err instanceof Error ? err.message : String(err) });
    return new Response(JSON.stringify({ error: "Webhook handler failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function resolveUserIdByCustomer(
  supabaseAdmin: ReturnType<typeof createClient>,
  stripe: Stripe,
  customerId: string
): Promise<string | null> {
  const { data: existing } = await supabaseAdmin
    .from("subscribers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (existing?.user_id) return existing.user_id;

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  const email = (customer as Stripe.Customer).email;
  if (!email) return null;

  const { data } = await supabaseAdmin.rpc("get_user_id_by_email", { _email: email });
  return (data as string) ?? null;
}

async function upsertSubscriber(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  subscription: Stripe.Subscription
) {
  const status = subscription.status === "active" || subscription.status === "trialing" ? "active" : subscription.status;
  await supabaseAdmin.from("subscribers").upsert({
    user_id: userId,
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    status,
    plan: status === "active" ? "premium" : "free",
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}
