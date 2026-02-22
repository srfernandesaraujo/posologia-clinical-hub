
-- Table to track points earned by users
CREATE TABLE public.student_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL DEFAULT 0,
  source text NOT NULL, -- 'simulator_case', 'calculator_use', 'daily_login', 'streak_bonus'
  source_id text, -- optional reference (case_id, tool_slug, etc.)
  simulator_slug text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.student_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points"
ON public.student_points FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own points"
ON public.student_points FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all points"
ON public.student_points FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors can view all points"
ON public.student_points FOR SELECT
USING (has_role(auth.uid(), 'professor'::app_role));

CREATE INDEX idx_student_points_user ON public.student_points(user_id);
CREATE INDEX idx_student_points_created ON public.student_points(created_at);

-- Table to track earned badges
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id text NOT NULL, -- matches code-defined badge IDs
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own badges"
ON public.user_badges FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges"
ON public.user_badges FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all badges"
ON public.user_badges FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors can view all badges"
ON public.user_badges FOR SELECT
USING (has_role(auth.uid(), 'professor'::app_role));

CREATE INDEX idx_user_badges_user ON public.user_badges(user_id);

-- View for leaderboard (total points per user)
CREATE OR REPLACE VIEW public.leaderboard AS
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
