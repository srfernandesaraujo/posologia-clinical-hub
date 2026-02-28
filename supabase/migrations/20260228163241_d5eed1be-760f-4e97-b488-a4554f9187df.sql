
-- virtual_rooms: drop & recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can manage all rooms" ON public.virtual_rooms;
DROP POLICY IF EXISTS "Professors can manage their own rooms" ON public.virtual_rooms;
DROP POLICY IF EXISTS "Anyone can view active rooms by PIN" ON public.virtual_rooms;

CREATE POLICY "Admins can manage all rooms"
  ON public.virtual_rooms FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors can manage their own rooms"
  ON public.virtual_rooms FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'professor'::app_role) AND auth.uid() = created_by);

CREATE POLICY "Anyone can view active rooms by PIN"
  ON public.virtual_rooms FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- room_participants: drop & recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can view all participants" ON public.room_participants;
DROP POLICY IF EXISTS "Professors can view participants in their rooms" ON public.room_participants;
DROP POLICY IF EXISTS "Public can view participants" ON public.room_participants;
DROP POLICY IF EXISTS "Anyone can join a room" ON public.room_participants;

CREATE POLICY "Admins can view all participants"
  ON public.room_participants FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors can view participants in their rooms"
  ON public.room_participants FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'professor'::app_role) AND room_id IN (
    SELECT id FROM virtual_rooms WHERE created_by = auth.uid()
  ));

CREATE POLICY "Public can view participants"
  ON public.room_participants FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can join a room"
  ON public.room_participants FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM virtual_rooms WHERE id = room_participants.room_id AND is_active = true
  ));

-- room_submissions: drop & recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.room_submissions;
DROP POLICY IF EXISTS "Professors can view submissions in their rooms" ON public.room_submissions;
DROP POLICY IF EXISTS "Public can view submissions" ON public.room_submissions;
DROP POLICY IF EXISTS "Anyone can submit results to active rooms" ON public.room_submissions;

CREATE POLICY "Admins can view all submissions"
  ON public.room_submissions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors can view submissions in their rooms"
  ON public.room_submissions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'professor'::app_role) AND room_id IN (
    SELECT id FROM virtual_rooms WHERE created_by = auth.uid()
  ));

CREATE POLICY "Public can view submissions"
  ON public.room_submissions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can submit results to active rooms"
  ON public.room_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM virtual_rooms WHERE id = room_submissions.room_id AND is_active = true
  ));
