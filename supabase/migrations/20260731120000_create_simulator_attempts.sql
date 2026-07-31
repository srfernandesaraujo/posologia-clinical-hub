-- Persiste o score (0-100) que cada simulador já calcula por tentativa, hoje
-- descartado fora de Salas Virtuais (ver submitResults em useVirtualRoomCase.ts).
-- Log append-only por usuário, mesma filosofia de calculation_history/usage_logs.
CREATE TABLE public.simulator_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  simulator_slug text NOT NULL,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  actions jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_simulator_attempts_user_created ON public.simulator_attempts(user_id, created_at DESC);
CREATE INDEX idx_simulator_attempts_user_slug ON public.simulator_attempts(user_id, simulator_slug);

ALTER TABLE public.simulator_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own attempts"
  ON public.simulator_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own attempts, admins view all"
  ON public.simulator_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
