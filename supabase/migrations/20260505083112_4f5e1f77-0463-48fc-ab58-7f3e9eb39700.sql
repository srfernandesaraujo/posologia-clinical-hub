-- Add a proper unique constraint matching the upsert onConflict spec
-- Drop functional unique indexes first; we already store email lowercased on insert
DROP INDEX IF EXISTS public.uq_class_students_email;
DROP INDEX IF EXISTS public.class_students_class_email_unique;

ALTER TABLE public.class_students
  ADD CONSTRAINT class_students_class_id_email_key UNIQUE (class_id, email);