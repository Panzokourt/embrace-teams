
CREATE TABLE public.brain_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'strategic',
  subcategory text,
  priority text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  body text NOT NULL,
  evidence jsonb DEFAULT '[]'::jsonb,
  nlp_metadata jsonb DEFAULT '{}'::jsonb,
  neuro_tactic text,
  neuro_rationale text,
  market_context text,
  citations jsonb DEFAULT '[]'::jsonb,
  is_dismissed boolean NOT NULL DEFAULT false,
  is_actioned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brain_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view brain insights for their company"
  ON public.brain_insights FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT ucr.company_id FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.status = 'active'
    )
  );

CREATE POLICY "Users can update brain insights for their company"
  ON public.brain_insights FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT ucr.company_id FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.status = 'active'
    )
  );

CREATE POLICY "Service role can insert brain insights"
  ON public.brain_insights FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_brain_insights_company ON public.brain_insights(company_id);
CREATE INDEX idx_brain_insights_category ON public.brain_insights(category);
CREATE INDEX idx_brain_insights_created ON public.brain_insights(created_at DESC);
