-- Security fix: the "Users can update their own profile" RLS policy (UPDATE, USING only,
-- no WITH CHECK) lets any authenticated user set their own has_unlimited_access to true,
-- which useFeatureGating.ts treats as full Premium access. Block that column from being
-- changed by anyone other than an admin, without breaking normal profile updates.

CREATE OR REPLACE FUNCTION public.prevent_unlimited_access_self_grant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.has_unlimited_access IS DISTINCT FROM OLD.has_unlimited_access
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.has_unlimited_access := OLD.has_unlimited_access;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_unlimited_access_self_grant ON public.profiles;

CREATE TRIGGER trg_prevent_unlimited_access_self_grant
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_unlimited_access_self_grant();
