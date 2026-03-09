-- Restrict simulator case visibility: own/native/admin/purchased only
DROP POLICY IF EXISTS "Users can view own and native cases" ON public.simulator_cases;

CREATE POLICY "Users can view own native and purchased cases"
ON public.simulator_cases
FOR SELECT
USING (
  (created_by IS NULL)
  OR (created_by = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.marketplace_purchases mp
    WHERE mp.tool_type = 'caso_clinico'
      AND mp.tool_id = simulator_cases.id
      AND mp.buyer_id = auth.uid()
  )
);