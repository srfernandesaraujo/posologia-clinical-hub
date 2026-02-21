import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionPlan = "free" | "premium";

interface SubscriptionState {
  plan: SubscriptionPlan;
  subscribed: boolean;
  subscriptionEnd: string | null;
  loading: boolean;
}

// Stripe IDs
export const STRIPE_PLANS = {
  premium: {
    price_id: "price_1T3NWrHCdXdXOsuTqygSw3PH",
    product_id: "prod_U1QNl8Sm7yQNHn",
  },
} as const;

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    plan: "free",
    subscribed: false,
    subscriptionEnd: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState({ plan: "free", subscribed: false, subscriptionEnd: null, loading: false });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;

      setState({
        plan: data.subscribed ? "premium" : "free",
        subscribed: data.subscribed,
        subscriptionEnd: data.subscription_end || null,
        loading: false,
      });
    } catch (err) {
      console.error("Error checking subscription:", err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const isPremium = state.plan === "premium";

  const startCheckout = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: STRIPE_PLANS.premium.price_id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Error starting checkout:", err);
      throw err;
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Error opening portal:", err);
      throw err;
    }
  };

  return {
    ...state,
    isPremium,
    checkSubscription,
    startCheckout,
    openCustomerPortal,
  };
}
