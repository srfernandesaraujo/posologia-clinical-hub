
-- Virtual rooms created by professors/admins
CREATE TABLE public.virtual_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pin TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  simulator_slug TEXT NOT NULL,
  case_id UUID REFERENCES public.simulator_cases(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Participants (students) who join rooms
CREATE TABLE public.room_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.virtual_rooms(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  is_group BOOLEAN NOT NULL DEFAULT false,
  group_members JSONB DEFAULT '[]'::jsonb,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Performance submissions per consultation/step
CREATE TABLE public.room_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.virtual_rooms(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.room_participants(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL DEFAULT 0,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_virtual_rooms_pin ON public.virtual_rooms(pin);
CREATE INDEX idx_virtual_rooms_created_by ON public.virtual_rooms(created_by);
CREATE INDEX idx_room_participants_room_id ON public.room_participants(room_id);
CREATE INDEX idx_room_submissions_room_id ON public.room_submissions(room_id);
CREATE INDEX idx_room_submissions_participant_id ON public.room_submissions(participant_id);

-- Enable RLS
ALTER TABLE public.virtual_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_submissions ENABLE ROW LEVEL SECURITY;

-- RLS for virtual_rooms
CREATE POLICY "Admins can manage all rooms"
ON public.virtual_rooms FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors can manage their own rooms"
ON public.virtual_rooms FOR ALL
USING (has_role(auth.uid(), 'professor'::app_role) AND auth.uid() = created_by);

CREATE POLICY "Anyone can view active rooms by PIN"
ON public.virtual_rooms FOR SELECT
USING (is_active = true);

-- RLS for room_participants
CREATE POLICY "Anyone can join a room"
ON public.room_participants FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.virtual_rooms WHERE id = room_id AND is_active = true)
);

CREATE POLICY "Admins can view all participants"
ON public.room_participants FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors can view participants in their rooms"
ON public.room_participants FOR SELECT
USING (
  has_role(auth.uid(), 'professor'::app_role) AND
  room_id IN (SELECT id FROM public.virtual_rooms WHERE created_by = auth.uid())
);

CREATE POLICY "Public can view participants"
ON public.room_participants FOR SELECT
USING (true);

-- RLS for room_submissions
CREATE POLICY "Anyone can submit results to active rooms"
ON public.room_submissions FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.virtual_rooms WHERE id = room_id AND is_active = true)
);

CREATE POLICY "Admins can view all submissions"
ON public.room_submissions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors can view submissions in their rooms"
ON public.room_submissions FOR SELECT
USING (
  has_role(auth.uid(), 'professor'::app_role) AND
  room_id IN (SELECT id FROM public.virtual_rooms WHERE created_by = auth.uid())
);

CREATE POLICY "Public can view submissions"
ON public.room_submissions FOR SELECT
USING (true);
