
-- intake_workflows: workflow definitions
CREATE TABLE public.intake_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_create_project BOOLEAN NOT NULL DEFAULT false,
  project_template_id UUID REFERENCES public.project_templates(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflows in their company" ON public.intake_workflows
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage workflows" ON public.intake_workflows
  FOR ALL TO authenticated
  USING (public.is_company_admin_or_manager(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin_or_manager(auth.uid(), company_id));

CREATE TRIGGER update_intake_workflows_updated_at BEFORE UPDATE ON public.intake_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- intake_workflow_stages: stages per workflow
CREATE TABLE public.intake_workflow_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.intake_workflows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  stage_type TEXT NOT NULL DEFAULT 'review',
  required_fields JSONB DEFAULT '[]'::jsonb,
  approver_role TEXT,
  approver_user_id UUID,
  sla_hours INTEGER,
  notify_on_enter BOOLEAN NOT NULL DEFAULT true,
  auto_advance BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_workflow_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stages via workflow" ON public.intake_workflow_stages
  FOR SELECT TO authenticated
  USING (workflow_id IN (
    SELECT id FROM public.intake_workflows WHERE company_id IN (
      SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Admins can manage stages" ON public.intake_workflow_stages
  FOR ALL TO authenticated
  USING (workflow_id IN (
    SELECT id FROM public.intake_workflows WHERE public.is_company_admin_or_manager(auth.uid(), company_id)
  ))
  WITH CHECK (workflow_id IN (
    SELECT id FROM public.intake_workflows WHERE public.is_company_admin_or_manager(auth.uid(), company_id)
  ));

-- intake_requests: runtime instances
CREATE TABLE public.intake_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.intake_workflows(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  form_data JSONB DEFAULT '{}'::jsonb,
  current_stage_id UUID REFERENCES public.intake_workflow_stages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  requested_by UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view requests in their company" ON public.intake_requests
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can create requests" ON public.intake_requests
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid()) AND requested_by = auth.uid());

CREATE POLICY "Admins can manage requests" ON public.intake_requests
  FOR UPDATE TO authenticated
  USING (public.is_company_admin_or_manager(auth.uid(), company_id));

CREATE POLICY "Admins can delete requests" ON public.intake_requests
  FOR DELETE TO authenticated
  USING (public.is_company_admin_or_manager(auth.uid(), company_id));

CREATE TRIGGER update_intake_requests_updated_at BEFORE UPDATE ON public.intake_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- intake_request_history: audit trail
CREATE TABLE public.intake_request_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.intake_requests(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES public.intake_workflow_stages(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  actor_id UUID NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_request_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history in their company" ON public.intake_request_history
  FOR SELECT TO authenticated
  USING (request_id IN (
    SELECT id FROM public.intake_requests WHERE company_id IN (
      SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Authenticated users can insert history" ON public.intake_request_history
  FOR INSERT TO authenticated
  WITH CHECK (request_id IN (
    SELECT id FROM public.intake_requests WHERE company_id IN (
      SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid()
    )
  ));

-- Indexes
CREATE INDEX idx_intake_workflows_company ON public.intake_workflows(company_id);
CREATE INDEX idx_intake_workflow_stages_workflow ON public.intake_workflow_stages(workflow_id);
CREATE INDEX idx_intake_requests_company ON public.intake_requests(company_id);
CREATE INDEX idx_intake_requests_workflow ON public.intake_requests(workflow_id);
CREATE INDEX idx_intake_requests_status ON public.intake_requests(status);
CREATE INDEX idx_intake_request_history_request ON public.intake_request_history(request_id);
