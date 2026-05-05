-- 1. classes
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  semester text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX idx_classes_created_by ON public.classes(created_by);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own classes" ON public.classes
  FOR ALL TO authenticated
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins manage all classes" ON public.classes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. virtual_rooms.class_id  (must come before policies that reference it)
ALTER TABLE public.virtual_rooms
  ADD COLUMN class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;
CREATE INDEX idx_virtual_rooms_class_id ON public.virtual_rooms(class_id);

-- 3. class_students
CREATE TABLE public.class_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_class_students_email ON public.class_students(class_id, lower(email));
CREATE INDEX idx_class_students_class ON public.class_students(class_id);
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Class owners manage students" ON public.class_students
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_students.class_id AND c.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_students.class_id AND c.created_by = auth.uid()));
CREATE POLICY "Admins manage all class students" ON public.class_students
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can lookup class students of active rooms"
  ON public.class_students FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.virtual_rooms vr
    WHERE vr.class_id = class_students.class_id AND vr.is_active = true
  ));

-- 4. room_participants.class_student_id
ALTER TABLE public.room_participants
  ADD COLUMN class_student_id uuid REFERENCES public.class_students(id) ON DELETE SET NULL;
CREATE INDEX idx_room_participants_class_student ON public.room_participants(class_student_id);