import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICES = {
  calculadora: { price: 500, credit: 300 },
  simulador: { price: 1000, credit: 600 },
} as const;

const SUBSCRIPTION_PRICE_BRL = 2990; // R$ 29,90

const log = (step: string, details?: any) => {
  console.log(`[PURCHASE-TOOL] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("Usuário não autenticado");
    const buyer = userData.user;
    log("Buyer authenticated", { id: buyer.id, email: buyer.email });

    const { toolId } = await req.json();
    if (!toolId) throw new Error("toolId é obrigatório");

    // Get tool
    const { data: tool, error: toolErr } = await supabaseAdmin
      .from("tools")
      .select("id, name, type, created_by, is_marketplace")
      .eq("id", toolId)
      .single();
    if (toolErr || !tool) throw new Error("Ferramenta não encontrada");
    if (!tool.is_marketplace) throw new Error("Ferramenta não está no marketplace");
    if (!tool.created_by) throw new Error("Ferramenta não possui autor");
    if (tool.created_by === buyer.id) throw new Error("Você não pode comprar sua própria ferramenta");

    const toolType = tool.type as "calculadora" | "simulador";
    if (!PRICES[toolType]) throw new Error("Tipo de ferramenta inválido");

    // Check duplicate
    const { data: existing } = await supabaseAdmin
      .from("marketplace_purchases")
      .select("id")
      .eq("tool_id", toolId)
      .eq("buyer_id", buyer.id)
      .limit(1);
    if (existing && existing.length > 0) throw new Error("Você já adquiriu esta ferramenta");

    // Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Buyer must have active subscription
    const buyerCustomers = await stripe.customers.list({ email: buyer.email, limit: 1 });
    if (buyerCustomers.data.length === 0) throw new Error("Assinatura Premium necessária");
    const buyerCustomerId = buyerCustomers.data[0].id;

    const buyerSubs = await stripe.subscriptions.list({
      customer: buyerCustomerId,
      status: "active",
      limit: 1,
    });
    if (buyerSubs.data.length === 0) throw new Error("Assinatura Premium necessária");
    log("Buyer has active subscription");

    // Charge buyer
    const pricing = PRICES[toolType];
    await stripe.invoiceItems.create({
      customer: buyerCustomerId,
      amount: pricing.price,
      currency: "brl",
      description: `Marketplace: ${tool.name}`,
    });
    log("Buyer charged", { amount: pricing.price });

    // Credit seller
    const { data: sellerAuth } = await supabaseAdmin.auth.admin.getUserById(tool.created_by);
    const sellerEmail = sellerAuth?.user?.email;

    let sellerCredited = false;
    if (sellerEmail) {
      const sellerCustomers = await stripe.customers.list({ email: sellerEmail, limit: 1 });
      if (sellerCustomers.data.length > 0) {
        const sellerCustomerId = sellerCustomers.data[0].id;

        // Check 50% cap
        const { data: pendingCredits } = await supabaseAdmin
          .from("marketplace_purchases")
          .select("seller_credit")
          .eq("seller_id", tool.created_by)
          .eq("seller_credited", false);

        const totalCredits = (pendingCredits || []).reduce(
          (sum: number, p: any) => sum + Number(p.seller_credit),
          0
        );
        const maxDiscount = SUBSCRIPTION_PRICE_BRL / 2; // 50% = R$ 14,95
        const newCreditCents = pricing.credit;
        const newCreditBrl = newCreditCents / 100;

        if ((totalCredits + newCreditBrl) * 100 <= maxDiscount) {
          await stripe.invoiceItems.create({
            customer: sellerCustomerId,
            amount: -newCreditCents,
            currency: "brl",
            description: `Venda Marketplace: ${tool.name}`,
          });
          sellerCredited = true;
          log("Seller credited", { amount: -newCreditCents });
        } else {
          log("Seller credit cap reached", { totalCredits, maxDiscount: maxDiscount / 100 });
        }
      }
    }

    // Record purchase
    const { error: insertErr } = await supabaseAdmin.from("marketplace_purchases").insert({
      tool_id: toolId,
      buyer_id: buyer.id,
      seller_id: tool.created_by,
      tool_type: toolType,
      price_brl: pricing.price / 100,
      seller_credit: pricing.credit / 100,
      buyer_charged: true,
      seller_credited: sellerCredited,
    });
    if (insertErr) throw insertErr;

    log("Purchase recorded successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Compra realizada com sucesso!" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
