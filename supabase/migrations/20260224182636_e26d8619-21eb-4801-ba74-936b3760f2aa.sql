
-- =====================================================
-- MULTI-TENANT SECURITY FIX - Part 1: Functions + Core policies
-- =====================================================

-- STEP 1: Create is_company_admin_or_manager function
CREATE OR REPLACE FUNCTION public.is_company_admin_or_manager(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles
    WHERE user_id = _user_id 
    AND company_id = _company_id 
    AND role IN ('owner', 'admin', 'manager')
    AND status = 'active'
  )
$$;

-- STEP 2: Fix is_admin_or_manager to use only user_company_roles
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_company_roles
      WHERE user_id = _user_id 
      AND role IN ('owner', 'admin', 'manager')
      AND status = 'active'
    )
  END
$$;

-- STEP 3: Fix has_project_access to scope admin/manager check by company
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL OR _project_id IS NULL THEN false
    ELSE (
      EXISTS (
        SELECT 1 FROM public.project_user_access
        WHERE user_id = _user_id AND project_id = _project_id
      )
      OR EXISTS (
        SELECT 1 FROM public.project_team_access pta
        JOIN public.team_members tm ON tm.team_id = pta.team_id
        WHERE pta.project_id = _project_id AND tm.user_id = _user_id
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.user_company_roles ucr ON ucr.company_id = p.company_id
        WHERE p.id = _project_id 
        AND ucr.user_id = _user_id
        AND ucr.role IN ('owner', 'admin', 'manager')
        AND ucr.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.client_user_access cua ON cua.client_id = p.client_id
        WHERE p.id = _project_id AND cua.user_id = _user_id
      )
      OR EXISTS (
        SELECT 1 FROM public.user_access_assignments
        WHERE user_id = _user_id AND project_id = _project_id
      )
    )
  END
$$;

-- STEP 4: Fix has_hierarchical_access
CREATE OR REPLACE FUNCTION public.has_hierarchical_access(viewer_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_access_scope text;
  v_viewer_dept_id uuid;
  v_target_dept_id uuid;
BEGIN
  IF viewer_id = target_user_id THEN RETURN true; END IF;
  SELECT ucr.access_scope::text INTO v_access_scope
  FROM user_company_roles ucr WHERE ucr.user_id = viewer_id AND ucr.status = 'active' LIMIT 1;
  IF v_access_scope = 'company' AND EXISTS (
    SELECT 1 FROM user_company_roles WHERE user_id = viewer_id AND role IN ('owner','admin','manager') AND status = 'active'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = viewer_id AND ucr2.user_id = target_user_id
      AND ucr1.status = 'active' AND ucr2.status = 'active'
    ) THEN RETURN true; END IF;
  END IF;
  IF target_user_id IN (SELECT * FROM get_subordinate_users(viewer_id)) THEN RETURN true; END IF;
  SELECT p.department_id INTO v_target_dept_id FROM profiles p WHERE p.id = target_user_id;
  IF v_target_dept_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM departments d WHERE d.id = v_target_dept_id AND d.head_user_id = viewer_id
  ) THEN RETURN true; END IF;
  IF v_access_scope = 'department' THEN
    SELECT p.department_id INTO v_viewer_dept_id FROM profiles p WHERE p.id = viewer_id;
    IF v_viewer_dept_id IS NOT NULL AND v_target_dept_id = v_viewer_dept_id THEN RETURN true; END IF;
  END IF;
  RETURN false;
END;
$$;

-- === ACTIVITY_LOG ===
DROP POLICY IF EXISTS "Admin/Manager can view all activity" ON public.activity_log;
CREATE POLICY "Admin/Manager can view all activity" ON public.activity_log
  FOR SELECT USING (is_admin_or_manager(auth.uid()));

-- === BILLING_NOTIFICATIONS ===
DROP POLICY IF EXISTS "Admin/Manager can manage billing notifications" ON public.billing_notifications;
DROP POLICY IF EXISTS "Admin/Manager can view billing notifications" ON public.billing_notifications;
CREATE POLICY "Admin/Manager can manage billing notifications" ON public.billing_notifications
  FOR ALL USING (company_id IS NOT NULL AND is_company_admin_or_manager(auth.uid(), company_id));
CREATE POLICY "Admin/Manager can view billing notifications" ON public.billing_notifications
  FOR SELECT USING (company_id IS NOT NULL AND is_company_admin_or_manager(auth.uid(), company_id));

-- === BRIEFS ===
DROP POLICY IF EXISTS "Admin/Manager can manage briefs" ON public.briefs;
CREATE POLICY "Admin/Manager can manage briefs" ON public.briefs
  FOR ALL USING (
    (company_id IS NOT NULL AND is_company_admin_or_manager(auth.uid(), company_id))
    OR (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects p WHERE p.id = briefs.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)
    ))
  );

-- === CALENDAR_EVENT_ATTENDEES ===
DROP POLICY IF EXISTS "Admin/Manager can manage all attendees" ON public.calendar_event_attendees;
CREATE POLICY "Admin/Manager can manage all attendees" ON public.calendar_event_attendees
  FOR ALL USING (EXISTS (
    SELECT 1 FROM calendar_events e WHERE e.id = calendar_event_attendees.event_id AND is_company_admin_or_manager(auth.uid(), e.company_id)
  ));

-- === COMMENTS ===
DROP POLICY IF EXISTS "Admin/Manager can manage all comments" ON public.comments;
CREATE POLICY "Admin/Manager can manage all comments" ON public.comments
  FOR ALL USING (
    (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM projects p WHERE p.id = comments.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)))
    OR (task_id IS NOT NULL AND EXISTS (SELECT 1 FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = comments.task_id AND is_company_admin_or_manager(auth.uid(), p.company_id)))
    OR (deliverable_id IS NOT NULL AND EXISTS (SELECT 1 FROM deliverables d JOIN projects p ON p.id = d.project_id WHERE d.id = comments.deliverable_id AND is_company_admin_or_manager(auth.uid(), p.company_id)))
  );

-- === CONTRACTS ===
DROP POLICY IF EXISTS "Admin/Manager can manage contracts" ON public.contracts;
CREATE POLICY "Admin/Manager can manage contracts" ON public.contracts
  FOR ALL USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = contracts.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)));

-- === DELIVERABLES ===
DROP POLICY IF EXISTS "Admin/Manager can manage deliverables" ON public.deliverables;
CREATE POLICY "Admin/Manager can manage deliverables" ON public.deliverables
  FOR ALL USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = deliverables.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)));

-- === EXPENSES ===
DROP POLICY IF EXISTS "Admin/Manager can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin/Manager can view expenses" ON public.expenses;
CREATE POLICY "Admin/Manager can manage expenses" ON public.expenses
  FOR ALL USING (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM projects p WHERE p.id = expenses.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)));
CREATE POLICY "Admin/Manager can view expenses" ON public.expenses
  FOR SELECT USING (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM projects p WHERE p.id = expenses.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)));

-- === FILE_ATTACHMENTS ===
DROP POLICY IF EXISTS "Admin/Manager can manage all files" ON public.file_attachments;
CREATE POLICY "Admin/Manager can manage all files" ON public.file_attachments
  FOR ALL USING (
    (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM projects p WHERE p.id = file_attachments.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)))
    OR (tender_id IS NOT NULL AND EXISTS (SELECT 1 FROM tenders t WHERE t.id = file_attachments.tender_id AND is_company_admin_or_manager(auth.uid(), t.company_id)))
  );
DROP POLICY IF EXISTS "Users can view files on their tenders" ON public.file_attachments;
CREATE POLICY "Users can view files on their tenders" ON public.file_attachments
  FOR SELECT USING (tender_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM tenders t WHERE t.id = file_attachments.tender_id AND is_company_admin_or_manager(auth.uid(), t.company_id))
    OR EXISTS (SELECT 1 FROM tender_team_access WHERE tender_id = file_attachments.tender_id AND user_id = auth.uid())
  ));

-- === FILE_FOLDERS ===
DROP POLICY IF EXISTS "Admin/Manager can manage folders" ON public.file_folders;
CREATE POLICY "Admin/Manager can manage folders" ON public.file_folders
  FOR ALL USING (
    (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM projects p WHERE p.id = file_folders.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)))
    OR (tender_id IS NOT NULL AND EXISTS (SELECT 1 FROM tenders t WHERE t.id = file_folders.tender_id AND is_company_admin_or_manager(auth.uid(), t.company_id)))
  );
DROP POLICY IF EXISTS "Users can view tender folders" ON public.file_folders;
CREATE POLICY "Users can view tender folders" ON public.file_folders
  FOR SELECT USING (tender_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM tenders t WHERE t.id = file_folders.tender_id AND is_company_admin_or_manager(auth.uid(), t.company_id))
    OR EXISTS (SELECT 1 FROM tender_team_access WHERE tender_id = file_folders.tender_id AND user_id = auth.uid())
  ));

-- === INVOICES ===
DROP POLICY IF EXISTS "Admin/Manager can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admin/Manager can view invoices" ON public.invoices;
CREATE POLICY "Admin/Manager can manage invoices" ON public.invoices
  FOR ALL USING (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM projects p WHERE p.id = invoices.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)));
CREATE POLICY "Admin/Manager can view invoices" ON public.invoices
  FOR SELECT USING (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM projects p WHERE p.id = invoices.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)));

-- === MEDIA_PLANS ===
DROP POLICY IF EXISTS "Admin/Manager can manage media plans" ON public.media_plans;
CREATE POLICY "Admin/Manager can manage media plans" ON public.media_plans
  FOR ALL USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = media_plans.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)));

-- === MEDIA_PLAN_ITEMS (via media_plan -> project) ===
DROP POLICY IF EXISTS "Admin/Manager can manage media plan items" ON public.media_plan_items;
CREATE POLICY "Admin/Manager can manage media plan items" ON public.media_plan_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM media_plans mp JOIN projects p ON p.id = mp.project_id 
    WHERE mp.id = media_plan_items.media_plan_id AND is_company_admin_or_manager(auth.uid(), p.company_id)
  ));

-- === PROJECT_CONTACT_ACCESS ===
DROP POLICY IF EXISTS "Active users can view project contacts" ON public.project_contact_access;
DROP POLICY IF EXISTS "Admin/Manager can manage project contacts" ON public.project_contact_access;
CREATE POLICY "Active users can view project contacts" ON public.project_contact_access
  FOR SELECT USING (has_project_access(auth.uid(), project_id));
CREATE POLICY "Admin/Manager can manage project contacts" ON public.project_contact_access
  FOR ALL USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_contact_access.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)));

-- === PROJECT_CREATIVES ===
DROP POLICY IF EXISTS "Admin/Manager can manage creatives" ON public.project_creatives;
CREATE POLICY "Admin/Manager can manage creatives" ON public.project_creatives
  FOR ALL USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_creatives.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)));

-- === PROJECT_TEAM_ACCESS ===
DROP POLICY IF EXISTS "Active users can view project team access" ON public.project_team_access;
DROP POLICY IF EXISTS "Admin/Manager can manage project team access" ON public.project_team_access;
CREATE POLICY "Active users can view project team access" ON public.project_team_access
  FOR SELECT USING (has_project_access(auth.uid(), project_id));
CREATE POLICY "Admin/Manager can manage project team access" ON public.project_team_access
  FOR ALL USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_team_access.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)));

-- === PROJECT_USER_ACCESS ===
DROP POLICY IF EXISTS "Active users can view project user access" ON public.project_user_access;
DROP POLICY IF EXISTS "Admin/Manager can manage project user access" ON public.project_user_access;
CREATE POLICY "Active users can view project user access" ON public.project_user_access
  FOR SELECT USING (has_project_access(auth.uid(), project_id));
CREATE POLICY "Admin/Manager can manage project user access" ON public.project_user_access
  FOR ALL USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_user_access.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)));

-- === PROJECT_TEMPLATES ===
DROP POLICY IF EXISTS "Admin/Manager can manage project templates" ON public.project_templates;
DROP POLICY IF EXISTS "Active users can view project templates" ON public.project_templates;
CREATE POLICY "Admin/Manager can manage project templates" ON public.project_templates
  FOR ALL USING (company_id IS NOT NULL AND is_company_admin_or_manager(auth.uid(), company_id));
CREATE POLICY "Active users can view project templates" ON public.project_templates
  FOR SELECT USING (is_active_user(auth.uid()) AND is_active = true AND company_id = get_user_company_id(auth.uid()));

-- === PROJECT_TEMPLATE_TASKS ===
DROP POLICY IF EXISTS "Active users can view template tasks" ON public.project_template_tasks;
DROP POLICY IF EXISTS "Admin/Manager can manage template tasks" ON public.project_template_tasks;
CREATE POLICY "Active users can view template tasks" ON public.project_template_tasks
  FOR SELECT USING (EXISTS (SELECT 1 FROM project_templates pt WHERE pt.id = project_template_tasks.template_id AND pt.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Admin/Manager can manage template tasks" ON public.project_template_tasks
  FOR ALL USING (EXISTS (SELECT 1 FROM project_templates pt WHERE pt.id = project_template_tasks.template_id AND is_company_admin_or_manager(auth.uid(), pt.company_id)));

-- === PROJECT_TEMPLATE_DELIVERABLES ===
DROP POLICY IF EXISTS "Active users can view template deliverables" ON public.project_template_deliverables;
DROP POLICY IF EXISTS "Admin/Manager can manage template deliverables" ON public.project_template_deliverables;
CREATE POLICY "Active users can view template deliverables" ON public.project_template_deliverables
  FOR SELECT USING (EXISTS (SELECT 1 FROM project_templates pt WHERE pt.id = project_template_deliverables.template_id AND pt.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Admin/Manager can manage template deliverables" ON public.project_template_deliverables
  FOR ALL USING (EXISTS (SELECT 1 FROM project_templates pt WHERE pt.id = project_template_deliverables.template_id AND is_company_admin_or_manager(auth.uid(), pt.company_id)));

-- === PROJECTS ===
DROP POLICY IF EXISTS "Admin/Manager can manage projects" ON public.projects;
CREATE POLICY "Admin/Manager can manage projects" ON public.projects
  FOR ALL USING (is_company_admin_or_manager(auth.uid(), company_id));

-- === SERVICES ===
DROP POLICY IF EXISTS "Active users can view services" ON public.services;
DROP POLICY IF EXISTS "Admin/Manager can manage services" ON public.services;
CREATE POLICY "Active users can view services" ON public.services
  FOR SELECT USING (company_id IS NOT NULL AND company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Admin/Manager can manage services" ON public.services
  FOR ALL USING (company_id IS NOT NULL AND is_company_admin_or_manager(auth.uid(), company_id));

-- === TASK_TEMPLATES (has company_id, NOT project_id) ===
DROP POLICY IF EXISTS "Active users can view task templates" ON public.task_templates;
DROP POLICY IF EXISTS "Admin/Manager can manage task templates" ON public.task_templates;
CREATE POLICY "Active users can view task templates" ON public.task_templates
  FOR SELECT USING (is_active_user(auth.uid()) AND company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Admin/Manager can manage task templates" ON public.task_templates
  FOR ALL USING (company_id IS NOT NULL AND is_company_admin_or_manager(auth.uid(), company_id));

-- === TASKS ===
DROP POLICY IF EXISTS "Admin/Manager can manage tasks" ON public.tasks;
CREATE POLICY "Admin/Manager can manage tasks" ON public.tasks
  FOR ALL USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = tasks.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)));

-- === TEAM_MEMBERS ===
DROP POLICY IF EXISTS "Active users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Admin/Manager can manage team members" ON public.team_members;
CREATE POLICY "Active users can view team members" ON public.team_members
  FOR SELECT USING (EXISTS (SELECT 1 FROM teams t WHERE t.id = team_members.team_id AND (t.company_id IS NULL OR t.company_id = get_user_company_id(auth.uid()))));
CREATE POLICY "Admin/Manager can manage team members" ON public.team_members
  FOR ALL USING (EXISTS (SELECT 1 FROM teams t WHERE t.id = team_members.team_id AND t.company_id IS NOT NULL AND is_company_admin_or_manager(auth.uid(), t.company_id)));

-- === TENDERS ===
DROP POLICY IF EXISTS "Admin/Manager can manage company tenders" ON public.tenders;
DROP POLICY IF EXISTS "Admin/Manager can view company tenders" ON public.tenders;
CREATE POLICY "Admin/Manager can manage company tenders" ON public.tenders
  FOR ALL USING (company_id IS NOT NULL AND is_company_admin_or_manager(auth.uid(), company_id));
CREATE POLICY "Admin/Manager can view company tenders" ON public.tenders
  FOR SELECT USING (company_id IS NOT NULL AND is_company_admin_or_manager(auth.uid(), company_id));

-- === TENDER_DELIVERABLES ===
DROP POLICY IF EXISTS "Admins and managers can create tender deliverables" ON public.tender_deliverables;
DROP POLICY IF EXISTS "Admins and managers can delete tender deliverables" ON public.tender_deliverables;
DROP POLICY IF EXISTS "Admins and managers can update tender deliverables" ON public.tender_deliverables;
DROP POLICY IF EXISTS "Users can view tender deliverables from their company" ON public.tender_deliverables;
CREATE POLICY "Company admins can manage tender deliverables" ON public.tender_deliverables
  FOR ALL USING (EXISTS (SELECT 1 FROM tenders t WHERE t.id = tender_deliverables.tender_id AND is_company_admin_or_manager(auth.uid(), t.company_id)));
CREATE POLICY "Users can view tender deliverables from their company" ON public.tender_deliverables
  FOR SELECT USING (EXISTS (SELECT 1 FROM tenders t JOIN user_company_roles ucr ON ucr.company_id = t.company_id WHERE t.id = tender_deliverables.tender_id AND ucr.user_id = auth.uid() AND ucr.status = 'active'));

-- === TENDER_EVALUATION_CRITERIA ===
DROP POLICY IF EXISTS "Admin/Manager can manage evaluation criteria" ON public.tender_evaluation_criteria;
DROP POLICY IF EXISTS "Admin/Manager can view evaluation criteria" ON public.tender_evaluation_criteria;
CREATE POLICY "Admin/Manager can manage evaluation criteria" ON public.tender_evaluation_criteria
  FOR ALL USING (EXISTS (SELECT 1 FROM tenders t WHERE t.id = tender_evaluation_criteria.tender_id AND is_company_admin_or_manager(auth.uid(), t.company_id)));
CREATE POLICY "Admin/Manager can view evaluation criteria" ON public.tender_evaluation_criteria
  FOR SELECT USING (EXISTS (SELECT 1 FROM tenders t WHERE t.id = tender_evaluation_criteria.tender_id AND is_company_admin_or_manager(auth.uid(), t.company_id)));

-- === TENDER_SUGGESTIONS ===
DROP POLICY IF EXISTS "Admins and managers can delete tender suggestions" ON public.tender_suggestions;
DROP POLICY IF EXISTS "Admins and managers can insert tender suggestions" ON public.tender_suggestions;
DROP POLICY IF EXISTS "Admins and managers can update tender suggestions" ON public.tender_suggestions;
DROP POLICY IF EXISTS "Admins and managers can view tender suggestions" ON public.tender_suggestions;
CREATE POLICY "Company admins can manage tender suggestions" ON public.tender_suggestions
  FOR ALL USING (EXISTS (SELECT 1 FROM tenders t WHERE t.id = tender_suggestions.tender_id AND is_company_admin_or_manager(auth.uid(), t.company_id)));
CREATE POLICY "Company users can view tender suggestions" ON public.tender_suggestions
  FOR SELECT USING (EXISTS (SELECT 1 FROM tenders t WHERE t.id = tender_suggestions.tender_id AND is_company_admin_or_manager(auth.uid(), t.company_id)));

-- === TENDER_TASKS ===
DROP POLICY IF EXISTS "Admins and managers can create tender tasks" ON public.tender_tasks;
DROP POLICY IF EXISTS "Admins and managers can delete tender tasks" ON public.tender_tasks;
DROP POLICY IF EXISTS "Admins and managers can update tender tasks" ON public.tender_tasks;
DROP POLICY IF EXISTS "Users can view tender tasks from their company" ON public.tender_tasks;
CREATE POLICY "Company admins can manage tender tasks" ON public.tender_tasks
  FOR ALL USING (EXISTS (SELECT 1 FROM tenders t WHERE t.id = tender_tasks.tender_id AND is_company_admin_or_manager(auth.uid(), t.company_id)));
CREATE POLICY "Users can view tender tasks from their company" ON public.tender_tasks
  FOR SELECT USING (EXISTS (SELECT 1 FROM tenders t JOIN user_company_roles ucr ON ucr.company_id = t.company_id WHERE t.id = tender_tasks.tender_id AND ucr.user_id = auth.uid() AND ucr.status = 'active'));

-- === TENDER_TEAM_ACCESS ===
DROP POLICY IF EXISTS "Admin/Manager can manage tender team" ON public.tender_team_access;
DROP POLICY IF EXISTS "Users can view their tender assignments" ON public.tender_team_access;
CREATE POLICY "Admin/Manager can manage tender team" ON public.tender_team_access
  FOR ALL USING (EXISTS (SELECT 1 FROM tenders t WHERE t.id = tender_team_access.tender_id AND is_company_admin_or_manager(auth.uid(), t.company_id)));
CREATE POLICY "Users can view their tender assignments" ON public.tender_team_access
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM tenders t WHERE t.id = tender_team_access.tender_id AND is_company_admin_or_manager(auth.uid(), t.company_id)));

-- === TIME_ENTRIES ===
DROP POLICY IF EXISTS "Admin/Manager can manage all time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Admin/Manager can view all time entries" ON public.time_entries;
CREATE POLICY "Admin/Manager can manage all time entries" ON public.time_entries
  FOR ALL USING (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM projects p WHERE p.id = time_entries.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)));
CREATE POLICY "Admin/Manager can view all time entries" ON public.time_entries
  FOR SELECT USING (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM projects p WHERE p.id = time_entries.project_id AND is_company_admin_or_manager(auth.uid(), p.company_id)));

-- === WORK_DAY_LOGS ===
DROP POLICY IF EXISTS "Admin/Manager can manage all logs" ON public.work_day_logs;
CREATE POLICY "Admin/Manager can manage all logs" ON public.work_day_logs
  FOR ALL USING (company_id IS NOT NULL AND is_company_admin_or_manager(auth.uid(), company_id));

-- === WORK_SCHEDULES ===
DROP POLICY IF EXISTS "Admin/Manager can manage all schedules" ON public.work_schedules;
CREATE POLICY "Admin/Manager can manage all schedules" ON public.work_schedules
  FOR ALL USING (company_id IS NOT NULL AND is_company_admin_or_manager(auth.uid(), company_id));
