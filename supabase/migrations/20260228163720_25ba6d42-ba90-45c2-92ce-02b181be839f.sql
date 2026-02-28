-- Ajuste de RLS para Salas Virtuais: permitir gerenciamento por dono da sala (auth.uid = created_by)

-- 1) virtual_rooms: trocar política de professor por política de dono da sala
DROP POLICY IF EXISTS "Professors can manage their own rooms" ON public.virtual_rooms;

CREATE POLICY "Users can manage their own rooms"
  ON public.virtual_rooms
  FOR ALL
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- 2) room_participants: trocar política de professor por política de dono da sala
DROP POLICY IF EXISTS "Professors can view participants in their rooms" ON public.room_participants;

CREATE POLICY "Room owners can view participants in their rooms"
  ON public.room_participants
  FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT vr.id
      FROM public.virtual_rooms vr
      WHERE vr.created_by = auth.uid()
    )
  );

-- 3) room_submissions: trocar política de professor por política de dono da sala
DROP POLICY IF EXISTS "Professors can view submissions in their rooms" ON public.room_submissions;

CREATE POLICY "Room owners can view submissions in their rooms"
  ON public.room_submissions
  FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT vr.id
      FROM public.virtual_rooms vr
      WHERE vr.created_by = auth.uid()
    )
  );