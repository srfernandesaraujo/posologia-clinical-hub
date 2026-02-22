
-- Fix: drop the SECURITY DEFINER view and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.leaderboard;

CREATE OR REPLACE VIEW public.leaderboard 
WITH (security_invoker = true)
AS
SELECT 
  sp.user_id,
  p.full_name,
  p.avatar_url,
  SUM(sp.points) as total_points,
  COUNT(DISTINCT DATE(sp.created_at)) as active_days,
  COUNT(DISTINCT ub.badge_id) as badge_count
FROM public.student_points sp
LEFT JOIN public.profiles p ON p.user_id = sp.user_id
LEFT JOIN public.user_badges ub ON ub.user_id = sp.user_id
GROUP BY sp.user_id, p.full_name, p.avatar_url;
