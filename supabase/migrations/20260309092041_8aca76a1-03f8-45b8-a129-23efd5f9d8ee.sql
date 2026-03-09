
-- 1. Add is_marketplace column to simulator_cases
ALTER TABLE public.simulator_cases ADD COLUMN IF NOT EXISTS is_marketplace boolean NOT NULL DEFAULT false;

-- 2. Drop old permissive SELECT policy that shows all cases to everyone
DROP POLICY IF EXISTS "Anyone authenticated can view simulator cases" ON public.simulator_cases;

-- 3. New SELECT policy: users see native cases (created_by IS NULL) + their own cases + marketplace cases they purchased
CREATE POLICY "Users can view own and native cases"
ON public.simulator_cases
FOR SELECT
TO authenticated
USING (
  created_by IS NULL
  OR created_by = auth.uid()
  OR (is_marketplace = true)
);

-- 4. Allow users to delete their own cases
DROP POLICY IF EXISTS "Users can delete own cases" ON public.simulator_cases;
CREATE POLICY "Users can delete own cases"
ON public.simulator_cases
FOR DELETE
TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 5. Allow users to update their own cases
DROP POLICY IF EXISTS "Users can update own cases" ON public.simulator_cases;
CREATE POLICY "Users can update own cases"
ON public.simulator_cases
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
