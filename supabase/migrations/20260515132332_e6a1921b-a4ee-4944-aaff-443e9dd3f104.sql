
-- 1. virtual_rooms: drop public select (PIN exposure)
DROP POLICY IF EXISTS "Authenticated or anon can view active rooms" ON public.virtual_rooms;
-- Authenticated users may still need to look up their own rooms etc., handled by existing
-- "Users can manage their own rooms" + "Admins can manage all rooms".
-- Allow authenticated users to view active rooms WITHOUT relying on it for PIN; UI uses
-- this for owner-side flows; restrict to authenticated only.
CREATE POLICY "Authenticated can view active rooms"
  ON public.virtual_rooms FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 2. class_students: drop anon lookup policy
DROP POLICY IF EXISTS "Anyone can lookup class students of active rooms" ON public.class_students;

-- 3. room_authorized_emails: drop anon read
DROP POLICY IF EXISTS "Anyone can check authorized emails in active rooms" ON public.room_authorized_emails;

-- 4. room_participants: drop anon read
DROP POLICY IF EXISTS "Anyone can view participants by room PIN lookup" ON public.room_participants;

-- 5. ai_usage_log: drop overly permissive policies; admins only
DROP POLICY IF EXISTS "Service role can read" ON public.ai_usage_log;
DROP POLICY IF EXISTS "Service role can insert" ON public.ai_usage_log;
CREATE POLICY "Admins can view ai usage"
  ON public.ai_usage_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
-- Inserts come from edge functions using the service role, which bypasses RLS.

-- 6. simulator_cases: tighten INSERT to require created_by = auth.uid()
DROP POLICY IF EXISTS "Users can insert AI-generated cases" ON public.simulator_cases;
CREATE POLICY "Users can insert their own AI-generated cases"
  ON public.simulator_cases FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_ai_generated = true
    AND created_by = auth.uid()
  );

-- 7. student_points: remove user-facing INSERT (handled server-side now)
DROP POLICY IF EXISTS "Users can insert their own points" ON public.student_points;

-- 8. user_badges: remove user-facing INSERT (handled server-side now)
DROP POLICY IF EXISTS "Users can insert their own badges" ON public.user_badges;
