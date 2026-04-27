-- ============================================================
-- 1. ACHIEVEMENTS catalog (global, seeded)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','platinum')),
  xp_reward INTEGER NOT NULL DEFAULT 0,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements readable by all authenticated"
ON public.achievements
FOR SELECT
TO authenticated
USING (is_active = true);

-- ============================================================
-- 2. USER_ACHIEVEMENTS (per user/company)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_company ON public.user_achievements(company_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON public.user_achievements(unlocked_at DESC NULLS LAST);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view achievements in their company"
ON public.user_achievements
FOR SELECT
TO authenticated
USING (company_id IN (
  SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid()
));

-- No INSERT/UPDATE/DELETE policies — only SECURITY DEFINER functions can write.

-- ============================================================
-- 3. award_xp upgrade — fix streak + recalc level
-- ============================================================
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id uuid,
  p_company_id uuid,
  p_points integer,
  p_reason text,
  p_source_type text DEFAULT 'system',
  p_source_entity_id uuid DEFAULT NULL,
  p_given_by uuid DEFAULT NULL,
  p_skill_tag text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total integer;
  new_level integer;
  streak_delta integer := 0;
  reset_streak boolean := false;
BEGIN
  -- Insert XP transaction
  INSERT INTO public.user_xp (user_id, company_id, points, reason, source_type, source_entity_id, given_by, skill_tag)
  VALUES (p_user_id, p_company_id, p_points, p_reason, p_source_type, p_source_entity_id, p_given_by, p_skill_tag);

  -- Determine streak effect
  IF p_reason IN ('task_completed_early', 'task_completed_on_time') THEN
    streak_delta := 1;
  ELSIF p_reason = 'task_completed_late' THEN
    reset_streak := true;
  END IF;

  -- Upsert summary
  INSERT INTO public.user_xp_summary (user_id, company_id, total_xp, level, tasks_completed, kudos_received, on_time_streak, updated_at)
  VALUES (
    p_user_id, p_company_id, GREATEST(p_points, 0), 1,
    CASE WHEN p_reason LIKE 'task_completed%' THEN 1 ELSE 0 END,
    CASE WHEN p_reason = 'kudos_received' THEN 1 ELSE 0 END,
    GREATEST(streak_delta, 0),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = GREATEST(user_xp_summary.total_xp + p_points, 0),
    tasks_completed = user_xp_summary.tasks_completed + CASE WHEN p_reason LIKE 'task_completed%' THEN 1 ELSE 0 END,
    kudos_received = user_xp_summary.kudos_received + CASE WHEN p_reason = 'kudos_received' THEN 1 ELSE 0 END,
    on_time_streak = CASE
      WHEN reset_streak THEN 0
      ELSE user_xp_summary.on_time_streak + streak_delta
    END,
    updated_at = now();

  -- Recalculate level
  SELECT total_xp INTO new_total FROM public.user_xp_summary WHERE user_id = p_user_id;
  new_level := GREATEST(1, floor((1 + sqrt(1 + 4.0 * new_total / 50.0)) / 2.0)::integer);
  UPDATE public.user_xp_summary SET level = new_level WHERE user_id = p_user_id;
END;
$$;

-- ============================================================
-- 4. unlock_achievement helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.unlock_achievement(
  p_user_id uuid,
  p_company_id uuid,
  p_achievement_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ach RECORD;
  already_unlocked boolean;
BEGIN
  SELECT * INTO ach FROM public.achievements WHERE code = p_achievement_code AND is_active = true LIMIT 1;
  IF ach IS NULL THEN
    RETURN jsonb_build_object('unlocked', false, 'reason', 'not_found');
  END IF;

  -- Check existing
  SELECT (unlocked_at IS NOT NULL) INTO already_unlocked
  FROM public.user_achievements
  WHERE user_id = p_user_id AND achievement_id = ach.id;

  IF already_unlocked IS TRUE THEN
    RETURN jsonb_build_object('unlocked', false, 'reason', 'already_unlocked');
  END IF;

  -- Upsert as unlocked
  INSERT INTO public.user_achievements (user_id, company_id, achievement_id, unlocked_at, progress)
  VALUES (p_user_id, p_company_id, ach.id, now(), 100)
  ON CONFLICT (user_id, achievement_id) DO UPDATE SET unlocked_at = now(), progress = 100;

  -- Award bonus XP
  IF ach.xp_reward > 0 THEN
    PERFORM public.award_xp(p_user_id, p_company_id, ach.xp_reward, 'achievement_unlocked', 'system', ach.id, NULL, NULL);
  END IF;

  RETURN jsonb_build_object(
    'unlocked', true,
    'achievement_id', ach.id,
    'code', ach.code,
    'title', ach.title,
    'description', ach.description,
    'icon', ach.icon,
    'tier', ach.tier,
    'xp_reward', ach.xp_reward
  );
END;
$$;

-- ============================================================
-- 5. Seed achievements catalog
-- ============================================================
INSERT INTO public.achievements (code, title, description, icon, tier, xp_reward, criteria, sort_order) VALUES
  ('first_task',          'Πρώτο Βήμα',         'Ολοκλήρωσες το πρώτο σου task.',                  '🎯', 'bronze',   15, '{"type":"tasks_completed","value":1}'::jsonb,        10),
  ('tasks_10',            'Productive',         'Ολοκλήρωσες 10 tasks.',                            '✅', 'bronze',   20, '{"type":"tasks_completed","value":10}'::jsonb,       20),
  ('tasks_50',            'Task Machine',       'Ολοκλήρωσες 50 tasks.',                            '⚙️', 'silver',   50, '{"type":"tasks_completed","value":50}'::jsonb,       30),
  ('tasks_200',           'Task Legend',        'Ολοκλήρωσες 200 tasks.',                           '🏆', 'gold',    150, '{"type":"tasks_completed","value":200}'::jsonb,      40),
  ('streak_5',            'On Fire',            '5 on-time tasks σε σειρά.',                        '🔥', 'bronze',   20, '{"type":"on_time_streak","value":5}'::jsonb,         50),
  ('streak_25',           'Punctuality King',   '25 on-time tasks σε σειρά.',                       '👑', 'gold',    100, '{"type":"on_time_streak","value":25}'::jsonb,        60),
  ('kudos_received_5',    'Appreciated',        'Έλαβες 5 kudos.',                                  '💝', 'bronze',   15, '{"type":"kudos_received","value":5}'::jsonb,         70),
  ('kudos_received_25',   'Crowd Favorite',     'Έλαβες 25 kudos.',                                 '🌟', 'gold',     80, '{"type":"kudos_received","value":25}'::jsonb,        80),
  ('kudos_given_10',      'Team Player',        'Έδωσες 10 kudos.',                                 '🤝', 'silver',   30, '{"type":"kudos_given","value":10}'::jsonb,           90),
  ('time_50h',            'Marathoner',         'Κατέγραψες 50 ώρες δουλειάς.',                     '⏱️', 'silver',   40, '{"type":"hours_logged","value":50}'::jsonb,         100),
  ('time_200h',           'Time Master',        'Κατέγραψες 200 ώρες δουλειάς.',                    '🕰️', 'gold',    100, '{"type":"hours_logged","value":200}'::jsonb,        110),
  ('files_10',            'Knowledge Sharer',   'Ανέβασες 10 αρχεία.',                              '📁', 'bronze',   15, '{"type":"files_uploaded","value":10}'::jsonb,       120),
  ('comments_25',         'Communicator',       'Έγραψες 25 σχόλια.',                               '💬', 'bronze',   15, '{"type":"comments_written","value":25}'::jsonb,     130),
  ('level_5',             'Apprentice',         'Έφτασες στο Level 5.',                             '🎖️', 'bronze',   25, '{"type":"level","value":5}'::jsonb,                 200),
  ('level_10',            'Professional',       'Έφτασες στο Level 10.',                            '🥈', 'silver',   75, '{"type":"level","value":10}'::jsonb,                210),
  ('level_15',            'Specialist',         'Έφτασες στο Level 15.',                            '🥇', 'gold',    150, '{"type":"level","value":15}'::jsonb,                220),
  ('level_20',            'Legend',             'Έφτασες στο Level 20.',                            '💎', 'platinum',300, '{"type":"level","value":20}'::jsonb,                230),
  ('daily_streak_7',      'Week Warrior',       '7 διαδοχικές μέρες δουλειάς.',                     '📅', 'silver',   40, '{"type":"daily_streak","value":7}'::jsonb,          300),
  ('daily_streak_30',     'Unstoppable',        '30 διαδοχικές μέρες δουλειάς.',                    '🚀', 'platinum',200, '{"type":"daily_streak","value":30}'::jsonb,         310),
  ('skill_specialist',    'Skill Specialist',   'Έλαβες 5 kudos για το ίδιο skill.',                '✨', 'silver',   40, '{"type":"skill_kudos","value":5}'::jsonb,           320)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  tier = EXCLUDED.tier,
  xp_reward = EXCLUDED.xp_reward,
  criteria = EXCLUDED.criteria,
  sort_order = EXCLUDED.sort_order;