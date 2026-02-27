
CREATE TABLE public.brain_deep_dives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  insight_id UUID REFERENCES public.brain_insights(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  insight_title TEXT NOT NULL,
  insight_category TEXT,
  extended_analysis TEXT NOT NULL,
  action_plan JSONB DEFAULT '[]'::jsonb,
  suggested_project JSONB,
  suggested_task JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brain_deep_dives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company deep dives"
  ON public.brain_deep_dives FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert deep dives"
  ON public.brain_deep_dives FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own deep dives"
  ON public.brain_deep_dives FOR DELETE
  USING (user_id = auth.uid());
