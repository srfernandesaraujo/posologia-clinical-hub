
CREATE TABLE public.ai_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_name TEXT NOT NULL,
  base_url TEXT,
  model TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AI API keys"
  ON public.ai_api_keys
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
