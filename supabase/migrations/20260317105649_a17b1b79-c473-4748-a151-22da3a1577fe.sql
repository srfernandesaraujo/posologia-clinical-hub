
-- Table for tracking tool/page visits across all native tools
CREATE TABLE public.tool_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tool_slug text NOT NULL,
  tool_name text NOT NULL,
  tool_category text NOT NULL DEFAULT 'outros',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast queries by user and date
CREATE INDEX idx_tool_visits_user_id ON public.tool_visits(user_id);
CREATE INDEX idx_tool_visits_created_at ON public.tool_visits(created_at DESC);
CREATE INDEX idx_tool_visits_slug ON public.tool_visits(tool_slug);

-- Enable RLS
ALTER TABLE public.tool_visits ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (even anonymous users)
CREATE POLICY "Anyone can insert tool visits"
  ON public.tool_visits FOR INSERT
  TO public
  WITH CHECK (true);

-- Users can view their own visits
CREATE POLICY "Users can view own visits"
  ON public.tool_visits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all visits
CREATE POLICY "Admins can view all visits"
  ON public.tool_visits FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
