
-- 1. Adicionar coluna restricted_access em virtual_rooms
ALTER TABLE public.virtual_rooms
  ADD COLUMN IF NOT EXISTS restricted_access boolean NOT NULL DEFAULT false;

-- 2. Tabela de emails autorizados por sala
CREATE TABLE IF NOT EXISTS public.room_authorized_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.virtual_rooms(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, email)
);

CREATE INDEX IF NOT EXISTS idx_room_authorized_emails_room ON public.room_authorized_emails(room_id);
CREATE INDEX IF NOT EXISTS idx_room_authorized_emails_email ON public.room_authorized_emails(lower(email));

ALTER TABLE public.room_authorized_emails ENABLE ROW LEVEL SECURITY;

-- Donos da sala e admins gerenciam
CREATE POLICY "Room owners manage authorized emails"
  ON public.room_authorized_emails
  FOR ALL
  TO authenticated
  USING (room_id IN (SELECT id FROM public.virtual_rooms WHERE created_by = auth.uid()))
  WITH CHECK (room_id IN (SELECT id FROM public.virtual_rooms WHERE created_by = auth.uid()));

CREATE POLICY "Admins manage authorized emails"
  ON public.room_authorized_emails
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Qualquer um pode consultar para validar acesso (apenas leitura) em salas ativas
CREATE POLICY "Anyone can check authorized emails in active rooms"
  ON public.room_authorized_emails
  FOR SELECT
  TO anon, authenticated
  USING (room_id IN (SELECT id FROM public.virtual_rooms WHERE is_active = true));

-- 3. Adicionar coluna participant_email em room_participants (opcional)
ALTER TABLE public.room_participants
  ADD COLUMN IF NOT EXISTS participant_email text;

-- 4. Permitir DELETE em room_submissions pelo dono da sala e admin
CREATE POLICY "Room owners can delete submissions"
  ON public.room_submissions
  FOR DELETE
  TO authenticated
  USING (room_id IN (SELECT id FROM public.virtual_rooms WHERE created_by = auth.uid()));

CREATE POLICY "Admins can delete submissions"
  ON public.room_submissions
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Permitir DELETE em room_participants para limpar registros pendentes/teste
CREATE POLICY "Room owners can delete participants"
  ON public.room_participants
  FOR DELETE
  TO authenticated
  USING (room_id IN (SELECT id FROM public.virtual_rooms WHERE created_by = auth.uid()));

CREATE POLICY "Admins can delete participants"
  ON public.room_participants
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
