-- Backfill class_students from existing room_authorized_emails for rooms that already belong to a class
INSERT INTO public.class_students (class_id, full_name, email)
SELECT DISTINCT vr.class_id, rae.student_name, lower(rae.email)
FROM public.room_authorized_emails rae
JOIN public.virtual_rooms vr ON vr.id = rae.room_id
WHERE vr.class_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Ensure unique index on (class_id, lower(email)) exists for upsert/conflict logic
CREATE UNIQUE INDEX IF NOT EXISTS class_students_class_email_unique
  ON public.class_students (class_id, lower(email));