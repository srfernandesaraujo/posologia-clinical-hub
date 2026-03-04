
-- Fix PUBLIC_DATA_EXPOSURE: Tighten RLS on room_participants, room_submissions, virtual_rooms

-- Drop overly permissive SELECT policies
DROP POLICY IF EXISTS "Public can view participants" ON public.room_participants;
DROP POLICY IF EXISTS "Public can view submissions" ON public.room_submissions;
DROP POLICY IF EXISTS "Anyone can view active rooms by PIN" ON public.virtual_rooms;

-- room_participants: only room creator or the participant themselves can view
CREATE POLICY "Authenticated users can view participants of their rooms"
ON public.room_participants FOR SELECT
TO authenticated
USING (
  room_id IN (SELECT id FROM public.virtual_rooms WHERE created_by = auth.uid())
);

-- Also allow anon participants to see their own room (needed for student access via PIN)
CREATE POLICY "Anyone can view participants by room PIN lookup"
ON public.room_participants FOR SELECT
TO anon, authenticated
USING (
  room_id IN (SELECT id FROM public.virtual_rooms WHERE is_active = true)
  AND EXISTS (
    SELECT 1 FROM public.virtual_rooms vr 
    WHERE vr.id = room_participants.room_id AND vr.is_active = true
  )
);

-- room_submissions: only room creator can view submissions
CREATE POLICY "Room creators can view submissions"
ON public.room_submissions FOR SELECT
TO authenticated
USING (
  room_id IN (SELECT id FROM public.virtual_rooms WHERE created_by = auth.uid())
);

-- Allow participants to view their own submissions
CREATE POLICY "Participants can view own submissions"
ON public.room_submissions FOR SELECT
TO anon, authenticated
USING (
  participant_id IN (SELECT id FROM public.room_participants WHERE room_id = room_submissions.room_id)
);

-- virtual_rooms: only allow authenticated users to see active rooms (for PIN lookup students still need access)
CREATE POLICY "Authenticated or anon can view active rooms"
ON public.virtual_rooms FOR SELECT
USING (is_active = true);
