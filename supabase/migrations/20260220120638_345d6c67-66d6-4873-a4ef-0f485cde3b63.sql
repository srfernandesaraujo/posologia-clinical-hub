
-- Table to store simulator clinical cases (both built-in and AI-generated)
CREATE TABLE public.simulator_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  simulator_slug TEXT NOT NULL, -- e.g. 'prm', 'antimicrobianos', 'tdm', 'acompanhamento', 'insulina'
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'Médio',
  case_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.simulator_cases ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view cases
CREATE POLICY "Anyone authenticated can view simulator cases"
ON public.simulator_cases FOR SELECT
USING (true);

-- Admins can manage all cases
CREATE POLICY "Admins can manage simulator cases"
ON public.simulator_cases FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Any authenticated user can insert AI-generated cases
CREATE POLICY "Users can insert AI-generated cases"
ON public.simulator_cases FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND is_ai_generated = true);

-- Index for fast lookup
CREATE INDEX idx_simulator_cases_slug ON public.simulator_cases(simulator_slug);
