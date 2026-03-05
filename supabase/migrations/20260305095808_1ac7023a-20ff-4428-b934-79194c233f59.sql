
CREATE TABLE public.calculation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  calculator_name text NOT NULL,
  calculator_slug text NOT NULL,
  patient_name text,
  calculation_date text,
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.calculation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own history"
  ON public.calculation_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history"
  ON public.calculation_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own history"
  ON public.calculation_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_calculation_history_user_id ON public.calculation_history(user_id);
CREATE INDEX idx_calculation_history_slug ON public.calculation_history(calculator_slug);
