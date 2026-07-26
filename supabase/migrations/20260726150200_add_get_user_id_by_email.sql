-- profiles has no email column, and auth.users isn't exposed via PostgREST,
-- so the stripe-webhook edge function (service role) needs a SECURITY DEFINER
-- RPC to map a Stripe customer's email back to a Supabase user_id as a fallback
-- when client_reference_id / subscription metadata isn't available (e.g.
-- subscriptions created before checkout started setting those fields).

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = _email LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_user_id_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO service_role;
