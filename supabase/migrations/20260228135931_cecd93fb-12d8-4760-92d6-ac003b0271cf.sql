-- Marketplace purchases table
CREATE TABLE public.marketplace_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  tool_type text NOT NULL CHECK (tool_type IN ('calculadora', 'simulador')),
  price_brl numeric NOT NULL,
  seller_credit numeric NOT NULL,
  buyer_charged boolean NOT NULL DEFAULT false,
  seller_credited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;

-- Users can see their own purchases (as buyer or seller)
CREATE POLICY "Users can view own purchases"
  ON public.marketplace_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Admins can do everything
CREATE POLICY "Admins can manage purchases"
  ON public.marketplace_purchases FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));