-- Phase 1: Extend tenders table
ALTER TABLE public.tenders ADD COLUMN IF NOT EXISTS tender_type TEXT DEFAULT 'public' CHECK (tender_type IN ('public', 'eu', 'private'));
ALTER TABLE public.tenders ADD COLUMN IF NOT EXISTS source_email TEXT;
ALTER TABLE public.tenders ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100);

-- Phase 2: Tender Evaluation Criteria
CREATE TABLE IF NOT EXISTS public.tender_evaluation_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  criterion TEXT NOT NULL,
  max_score INTEGER NOT NULL DEFAULT 10,
  our_score INTEGER CHECK (our_score >= 0),
  weight NUMERIC DEFAULT 1,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tender_evaluation_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can manage evaluation criteria"
ON public.tender_evaluation_criteria FOR ALL
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/Manager can view evaluation criteria"
ON public.tender_evaluation_criteria FOR SELECT
USING (auth.uid() IS NOT NULL AND is_admin_or_manager(auth.uid()));

-- Phase 3: Contracts table
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tender_id UUID REFERENCES public.tenders(id) ON DELETE SET NULL,
  contract_number TEXT,
  contract_type TEXT DEFAULT 'fixed' CHECK (contract_type IN ('fixed', 'retainer', 'hourly', 'mixed')),
  start_date DATE,
  end_date DATE,
  total_amount NUMERIC DEFAULT 0,
  billing_frequency TEXT DEFAULT 'milestone' CHECK (billing_frequency IN ('monthly', 'quarterly', 'milestone', 'project_end', 'custom')),
  payment_terms TEXT,
  terms TEXT,
  file_path TEXT,
  signed_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'completed', 'cancelled')),
  company_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can manage contracts"
ON public.contracts FOR ALL
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can view contracts for their projects"
ON public.contracts FOR SELECT
USING (auth.uid() IS NOT NULL AND has_project_access(auth.uid(), project_id));

-- Phase 4: Extend tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly'));
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS depends_on UUID REFERENCES public.tasks(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS actual_hours NUMERIC DEFAULT 0;

-- Phase 5: Billing Notifications
CREATE TABLE IF NOT EXISTS public.billing_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  deliverable_id UUID REFERENCES public.deliverables(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('ready_to_bill', 'milestone_complete', 'monthly_cycle', 'phase_complete', 'project_end')),
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  period_start DATE,
  period_end DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'invoiced', 'cancelled')),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  company_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.billing_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can manage billing notifications"
ON public.billing_notifications FOR ALL
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/Manager can view billing notifications"
ON public.billing_notifications FOR SELECT
USING (auth.uid() IS NOT NULL AND is_admin_or_manager(auth.uid()));

-- Phase 6: Task Templates for auto-generation
CREATE TABLE IF NOT EXISTS public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('tender_public', 'tender_eu', 'tender_private', 'project_general')),
  phase TEXT,
  default_priority TEXT DEFAULT 'medium',
  estimated_hours NUMERIC DEFAULT 0,
  depends_on_template_id UUID REFERENCES public.task_templates(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  assigned_role TEXT,
  company_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can manage task templates"
ON public.task_templates FOR ALL
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Active users can view task templates"
ON public.task_templates FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active_user(auth.uid()));

-- Tender Team Access (for assigning teams to tenders before they become projects)
CREATE TABLE IF NOT EXISTS public.tender_team_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tender_id, user_id)
);

ALTER TABLE public.tender_team_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can manage tender team"
ON public.tender_team_access FOR ALL
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can view their tender assignments"
ON public.tender_team_access FOR SELECT
USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR is_admin_or_manager(auth.uid())));

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tender_evaluation_criteria;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.billing_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tender_team_access;