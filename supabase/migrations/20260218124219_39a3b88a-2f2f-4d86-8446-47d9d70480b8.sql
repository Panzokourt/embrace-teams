
-- Project templates table
CREATE TABLE public.project_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id),
  name text NOT NULL,
  description text,
  project_type text NOT NULL, -- e.g. 'digital_campaign', 'event', 'pr', 'branding'
  default_budget numeric DEFAULT 0,
  default_agency_fee_percentage numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Template deliverables (auto-created when using template)
CREATE TABLE public.project_template_deliverables (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  default_budget numeric DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Template tasks (auto-created when using template)
CREATE TABLE public.project_template_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  deliverable_ref_order integer, -- links to deliverable by sort_order
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium',
  task_type text DEFAULT 'task',
  task_category text,
  estimated_hours numeric DEFAULT 0,
  sort_order integer DEFAULT 0,
  days_offset_start integer DEFAULT 0, -- days from project start
  days_offset_due integer DEFAULT 7, -- days from project start for due date
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_tasks ENABLE ROW LEVEL SECURITY;

-- Templates: admin/manager manage, active users view
CREATE POLICY "Admin/Manager can manage project templates"
  ON public.project_templates FOR ALL
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Active users can view project templates"
  ON public.project_templates FOR SELECT
  USING (is_active_user(auth.uid()) AND is_active = true);

-- Template deliverables
CREATE POLICY "Admin/Manager can manage template deliverables"
  ON public.project_template_deliverables FOR ALL
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Active users can view template deliverables"
  ON public.project_template_deliverables FOR SELECT
  USING (is_active_user(auth.uid()));

-- Template tasks
CREATE POLICY "Admin/Manager can manage template tasks"
  ON public.project_template_tasks FOR ALL
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Active users can view template tasks"
  ON public.project_template_tasks FOR SELECT
  USING (is_active_user(auth.uid()));

-- Indexes
CREATE INDEX idx_project_templates_company ON public.project_templates(company_id);
CREATE INDEX idx_project_template_deliverables_template ON public.project_template_deliverables(template_id);
CREATE INDEX idx_project_template_tasks_template ON public.project_template_tasks(template_id);

-- Updated_at trigger
CREATE TRIGGER update_project_templates_updated_at
  BEFORE UPDATE ON public.project_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
