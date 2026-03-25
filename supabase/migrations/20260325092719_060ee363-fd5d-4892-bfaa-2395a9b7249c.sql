CREATE TABLE public.system_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'update' CHECK (type IN ('update', 'idea')),
  status text NOT NULL DEFAULT 'done' CHECK (status IN ('done', 'planned', 'in_progress', 'idea')),
  title text NOT NULL,
  description text,
  category text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  version text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  implemented_at timestamp with time zone,
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system updates"
  ON public.system_updates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_system_updates_updated_at
  BEFORE UPDATE ON public.system_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();