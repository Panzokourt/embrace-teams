
-- 1. user_xp: XP transaction audit trail
CREATE TABLE public.user_xp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  reason text NOT NULL,
  source_type text NOT NULL DEFAULT 'system' CHECK (source_type IN ('system', 'kudos')),
  source_entity_id uuid,
  given_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  skill_tag text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. user_xp_summary: cached totals
CREATE TABLE public.user_xp_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  tasks_completed integer NOT NULL DEFAULT 0,
  on_time_streak integer NOT NULL DEFAULT 0,
  kudos_received integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. skill_tags: company-defined skill categories
CREATE TABLE public.skill_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_user_xp_user ON public.user_xp(user_id);
CREATE INDEX idx_user_xp_company ON public.user_xp(company_id);
CREATE INDEX idx_user_xp_created ON public.user_xp(created_at DESC);
CREATE INDEX idx_user_xp_summary_company ON public.user_xp_summary(company_id);
CREATE INDEX idx_user_xp_summary_total ON public.user_xp_summary(total_xp DESC);
CREATE INDEX idx_skill_tags_company ON public.skill_tags(company_id);

-- Enable RLS
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_xp_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_tags ENABLE ROW LEVEL SECURITY;

-- RLS: user_xp
CREATE POLICY "Users can view XP in their company" ON public.user_xp
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid()));

CREATE POLICY "System inserts XP via function" ON public.user_xp
  FOR INSERT TO authenticated
  WITH CHECK (
    source_type = 'kudos' AND given_by = auth.uid() AND user_id != auth.uid()
    AND company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid())
  );

-- RLS: user_xp_summary
CREATE POLICY "Users can view XP summaries in their company" ON public.user_xp_summary
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid()));

-- RLS: skill_tags
CREATE POLICY "Users can view skill tags in their company" ON public.skill_tags
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage skill tags" ON public.skill_tags
  FOR ALL TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

-- award_xp security definer function
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id uuid,
  p_company_id uuid,
  p_points integer,
  p_reason text,
  p_source_type text DEFAULT 'system',
  p_source_entity_id uuid DEFAULT NULL,
  p_given_by uuid DEFAULT NULL,
  p_skill_tag text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total integer;
  new_level integer;
  new_tasks integer;
  new_kudos integer;
BEGIN
  -- Insert XP transaction
  INSERT INTO public.user_xp (user_id, company_id, points, reason, source_type, source_entity_id, given_by, skill_tag)
  VALUES (p_user_id, p_company_id, p_points, p_reason, p_source_type, p_source_entity_id, p_given_by, p_skill_tag);

  -- Upsert summary
  INSERT INTO public.user_xp_summary (user_id, company_id, total_xp, level, tasks_completed, kudos_received, updated_at)
  VALUES (
    p_user_id, p_company_id, GREATEST(p_points, 0), 1,
    CASE WHEN p_reason LIKE 'task_completed%' THEN 1 ELSE 0 END,
    CASE WHEN p_reason = 'kudos_received' THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = GREATEST(user_xp_summary.total_xp + p_points, 0),
    tasks_completed = user_xp_summary.tasks_completed + CASE WHEN p_reason LIKE 'task_completed%' THEN 1 ELSE 0 END,
    kudos_received = user_xp_summary.kudos_received + CASE WHEN p_reason = 'kudos_received' THEN 1 ELSE 0 END,
    updated_at = now();

  -- Recalculate level: threshold(n) = 50 * n * (n-1), so level = floor((1 + sqrt(1 + 4*total/50)) / 2)
  SELECT total_xp INTO new_total FROM public.user_xp_summary WHERE user_id = p_user_id;
  new_level := GREATEST(1, floor((1 + sqrt(1 + 4.0 * new_total / 50.0)) / 2.0)::integer);
  
  UPDATE public.user_xp_summary SET level = new_level WHERE user_id = p_user_id;
END;
$$;

-- Allow authenticated users to call award_xp (function handles authorization)
GRANT EXECUTE ON FUNCTION public.award_xp TO authenticated;

-- Enable realtime for summaries (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_xp_summary;
