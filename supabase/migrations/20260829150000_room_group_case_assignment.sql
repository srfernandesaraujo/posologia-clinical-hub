-- Distribuição de casos clínicos por grupo dentro de uma mesma sala virtual.
-- Um "grupo" nasce implicitamente de e-mails autorizados que compartilham o
-- mesmo assigned_activity_id — não é uma entidade própria.

ALTER TABLE public.room_activities
  ADD COLUMN IF NOT EXISTS group_label text;

ALTER TABLE public.room_authorized_emails
  ADD COLUMN IF NOT EXISTS assigned_activity_id uuid REFERENCES public.room_activities(id) ON DELETE SET NULL;

ALTER TABLE public.room_participants
  ADD COLUMN IF NOT EXISTS assigned_activity_id uuid REFERENCES public.room_activities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_room_authorized_emails_assigned_activity
  ON public.room_authorized_emails(assigned_activity_id);
