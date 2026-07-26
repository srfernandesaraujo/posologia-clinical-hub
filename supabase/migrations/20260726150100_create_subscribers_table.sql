-- Persisted, auditable source of truth for Stripe subscription status.
-- Until now plan status was fetched live from Stripe on every check (check-subscription),
-- with no cache and no webhook — this table lets us reconcile via webhook and gives
-- server-side edge functions a fast, RLS-protected place to read premium status from.

CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'none',
  plan TEXT NOT NULL DEFAULT 'free',
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Only the row owner can read their own subscription status.
-- No INSERT/UPDATE policy for authenticated users on purpose: only the
-- service-role-backed stripe-webhook (and check-subscription's reconciliation
-- fallback) may write here, bypassing RLS via the service role key.
CREATE POLICY "Users can view their own subscription"
  ON public.subscribers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.subscribers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_subscribers_stripe_customer_id ON public.subscribers(stripe_customer_id);
