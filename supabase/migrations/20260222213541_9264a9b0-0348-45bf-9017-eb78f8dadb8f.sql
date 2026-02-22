
-- Table to track shared/embedded tool URLs
CREATE TABLE public.shared_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tool_id, user_id)
);

ALTER TABLE public.shared_tools ENABLE ROW LEVEL SECURITY;

-- Users can view their own shares
CREATE POLICY "Users can view their own shares"
ON public.shared_tools FOR SELECT
USING (auth.uid() = user_id);

-- Users can create shares for their own tools
CREATE POLICY "Users can insert their own shares"
ON public.shared_tools FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own shares (toggle active)
CREATE POLICY "Users can update their own shares"
ON public.shared_tools FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own shares
CREATE POLICY "Users can delete their own shares"
ON public.shared_tools FOR DELETE
USING (auth.uid() = user_id);

-- Admins can manage all shares
CREATE POLICY "Admins can manage all shares"
ON public.shared_tools FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public read access for active shares (needed for embed page without auth)
CREATE POLICY "Anyone can view active shares by token"
ON public.shared_tools FOR SELECT
USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_shared_tools_updated_at
BEFORE UPDATE ON public.shared_tools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_shared_tools_token ON public.shared_tools(share_token);
CREATE INDEX idx_shared_tools_user ON public.shared_tools(user_id);
