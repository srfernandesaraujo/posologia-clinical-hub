-- Speeds up case-insensitive lookups of a participant by e-mail, used by the
-- new student-performance edge function (wp.agents WhatsApp integration) to
-- find every room a given student's e-mail participated in, across rooms.
CREATE INDEX IF NOT EXISTS idx_room_participants_email_lower
  ON room_participants (lower(participant_email))
  WHERE participant_email IS NOT NULL;
