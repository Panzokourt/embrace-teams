
-- Add position and action columns to stages
ALTER TABLE public.intake_workflow_stages
  ADD COLUMN IF NOT EXISTS position_x FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS position_y FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS on_enter_actions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS on_exit_actions JSONB DEFAULT '[]'::jsonb;

-- Add versioning columns to workflows
ALTER TABLE public.intake_workflows
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS published_version INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT true;

-- Create connections table
CREATE TABLE public.intake_workflow_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.intake_workflows(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES public.intake_workflow_stages(id) ON DELETE CASCADE,
  to_stage_id UUID REFERENCES public.intake_workflow_stages(id) ON DELETE CASCADE,
  label TEXT,
  condition JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.intake_workflow_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view connections of their company workflows"
  ON public.intake_workflow_connections FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.intake_workflows w
      JOIN public.user_company_roles ucr ON ucr.company_id = w.company_id
      WHERE w.id = workflow_id AND ucr.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage connections"
  ON public.intake_workflow_connections FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.intake_workflows w
      WHERE w.id = workflow_id
      AND public.is_company_admin(auth.uid(), w.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.intake_workflows w
      WHERE w.id = workflow_id
      AND public.is_company_admin(auth.uid(), w.company_id)
    )
  );
