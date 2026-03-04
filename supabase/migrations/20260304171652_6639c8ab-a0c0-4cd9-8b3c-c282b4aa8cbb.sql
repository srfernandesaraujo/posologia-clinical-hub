
-- Tornar simulator_slug nullable em virtual_rooms
ALTER TABLE public.virtual_rooms 
  ALTER COLUMN simulator_slug DROP NOT NULL;

-- Tabela de atividades da prova
CREATE TABLE public.room_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.virtual_rooms(id) ON DELETE CASCADE,
  simulator_slug text NOT NULL,
  case_id uuid REFERENCES public.simulator_cases(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, position)
);

ALTER TABLE public.room_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Room owners can manage activities"
  ON public.room_activities FOR ALL TO authenticated
  USING (room_id IN (SELECT id FROM public.virtual_rooms WHERE created_by = auth.uid()))
  WITH CHECK (room_id IN (SELECT id FROM public.virtual_rooms WHERE created_by = auth.uid()));

CREATE POLICY "Anyone can view activities of active rooms"
  ON public.room_activities FOR SELECT TO anon, authenticated
  USING (room_id IN (SELECT id FROM public.virtual_rooms WHERE is_active = true));

CREATE POLICY "Admins can manage all activities"
  ON public.room_activities FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Campo activity_id em room_submissions
ALTER TABLE public.room_submissions 
  ADD COLUMN activity_id uuid REFERENCES public.room_activities(id) ON DELETE SET NULL;
