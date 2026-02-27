-- Fix SELECT policy on project_templates to include global (company_id IS NULL)
DROP POLICY IF EXISTS "Active users can view project templates" ON public.project_templates;
CREATE POLICY "Active users can view project templates"
  ON public.project_templates FOR SELECT
  USING (
    is_active_user(auth.uid())
    AND is_active = true
    AND (company_id = get_user_company_id(auth.uid()) OR company_id IS NULL)
  );

-- Fix SELECT policy on project_template_deliverables
DROP POLICY IF EXISTS "Active users can view template deliverables" ON public.project_template_deliverables;
CREATE POLICY "Active users can view template deliverables"
  ON public.project_template_deliverables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_templates pt
      WHERE pt.id = project_template_deliverables.template_id
      AND (pt.company_id = get_user_company_id(auth.uid()) OR pt.company_id IS NULL)
    )
  );

-- Fix SELECT policy on project_template_tasks
DROP POLICY IF EXISTS "Active users can view template tasks" ON public.project_template_tasks;
CREATE POLICY "Active users can view template tasks"
  ON public.project_template_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_templates pt
      WHERE pt.id = project_template_tasks.template_id
      AND (pt.company_id = get_user_company_id(auth.uid()) OR pt.company_id IS NULL)
    )
  );