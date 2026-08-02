-- Server-side daily rate limit for the "Paciente-IA por Voz" simulator (Fase 3,
-- item 09). Voice turns (STT + LLM + evaluation) are 10-30x more expensive than
-- the text-only AI calls the rest of the product makes, and there is no other
-- backend cost enforcement anywhere in the codebase today (only a trivially
-- bypassable client-side localStorage counter for calculators, unrelated to AI
-- spend) — so this table and its increment RPC are the first real cost guardrail.

CREATE TABLE public.voice_usage_daily (
  user_id uuid NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  turns_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.voice_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own voice usage"
  ON public.voice_usage_daily FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE policy for regular users: only edge functions (service role,
-- via increment_voice_usage_turn below, SECURITY DEFINER) write to this table.

CREATE OR REPLACE FUNCTION public.increment_voice_usage_turn(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO public.voice_usage_daily (user_id, usage_date, turns_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET turns_count = public.voice_usage_daily.turns_count + 1, updated_at = now()
  RETURNING turns_count INTO new_count;
  RETURN new_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_voice_usage_turn(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.voice_usage_daily
  SET turns_count = GREATEST(0, turns_count - 1), updated_at = now()
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
END;
$$;
