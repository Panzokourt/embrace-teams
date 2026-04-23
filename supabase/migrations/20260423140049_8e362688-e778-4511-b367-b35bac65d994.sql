-- Coaching state per user
CREATE TABLE IF NOT EXISTS public.user_coaching_state (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  dismissed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, feature_key)
);

ALTER TABLE public.user_coaching_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own coaching state"
  ON public.user_coaching_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own coaching state"
  ON public.user_coaching_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own coaching state"
  ON public.user_coaching_state FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own coaching state"
  ON public.user_coaching_state FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_coaching_state_user ON public.user_coaching_state(user_id);

-- Company AI enrichment log (rate-limit auto-discover)
CREATE TABLE IF NOT EXISTS public.company_enrichment_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  domain text,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_enrichment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own enrichment logs"
  ON public.company_enrichment_log FOR SELECT
  USING (auth.uid() = user_id OR (company_id IS NOT NULL AND public.is_company_admin(auth.uid(), company_id)));

CREATE POLICY "Users insert own enrichment logs"
  ON public.company_enrichment_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_company_enrichment_log_user_time ON public.company_enrichment_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_enrichment_log_company_time ON public.company_enrichment_log(company_id, created_at DESC);

-- Helper column on profiles for quick "first coach today" checks
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_coach_seen_at timestamptz;