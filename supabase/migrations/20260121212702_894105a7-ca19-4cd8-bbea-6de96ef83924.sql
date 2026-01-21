-- ============================================
-- PHASE 1B: Hierarchical Access Functions
-- ============================================

-- 1. Create function to check hierarchical access
CREATE OR REPLACE FUNCTION public.has_hierarchical_access(viewer_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access_scope text;
  v_viewer_dept_id uuid;
  v_target_dept_id uuid;
BEGIN
  -- Same user always has access
  IF viewer_id = target_user_id THEN
    RETURN true;
  END IF;

  -- Get viewer's access scope
  SELECT ucr.access_scope::text INTO v_access_scope
  FROM user_company_roles ucr
  WHERE ucr.user_id = viewer_id
  LIMIT 1;

  -- Admin or manager with company scope sees everyone
  IF is_admin_or_manager(viewer_id) AND v_access_scope = 'company' THEN
    RETURN true;
  END IF;

  -- Target is a subordinate
  IF target_user_id IN (SELECT * FROM get_subordinate_users(viewer_id)) THEN
    RETURN true;
  END IF;

  -- Same department and viewer is department head
  SELECT p.department_id INTO v_target_dept_id FROM profiles p WHERE p.id = target_user_id;
  IF v_target_dept_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM departments d WHERE d.id = v_target_dept_id AND d.head_user_id = viewer_id
  ) THEN
    RETURN true;
  END IF;

  -- Viewer has department scope and target is in their department
  IF v_access_scope = 'department' THEN
    SELECT p.department_id INTO v_viewer_dept_id FROM profiles p WHERE p.id = viewer_id;
    IF v_viewer_dept_id IS NOT NULL AND v_target_dept_id = v_viewer_dept_id THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- 2. Create function to get visible projects based on access scope
CREATE OR REPLACE FUNCTION public.get_visible_projects(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access_scope text;
  v_company_id uuid;
  v_department_id uuid;
BEGIN
  -- Get user's access scope and company
  SELECT ucr.access_scope::text, ucr.company_id INTO v_access_scope, v_company_id
  FROM user_company_roles ucr
  WHERE ucr.user_id = p_user_id
  LIMIT 1;
  
  -- Get user's department
  SELECT p.department_id INTO v_department_id
  FROM profiles p
  WHERE p.id = p_user_id;

  -- Return projects based on access scope
  IF v_access_scope = 'company' THEN
    -- Company scope: all projects in company
    RETURN QUERY SELECT id FROM projects WHERE company_id = v_company_id;
    
  ELSIF v_access_scope = 'department' AND v_department_id IS NOT NULL THEN
    -- Department scope: projects where any team member is in the department
    RETURN QUERY 
      SELECT DISTINCT p.id FROM projects p
      WHERE p.company_id = v_company_id
        AND (
          -- Projects with team members from the department
          EXISTS (
            SELECT 1 FROM project_user_access pua
            JOIN profiles prof ON prof.id = pua.user_id
            WHERE pua.project_id = p.id
              AND prof.department_id = v_department_id
          )
          OR
          -- Directly assigned projects
          EXISTS (SELECT 1 FROM project_user_access WHERE project_id = p.id AND user_id = p_user_id)
          OR
          EXISTS (SELECT 1 FROM user_access_assignments WHERE project_id = p.id AND user_id = p_user_id)
        );
        
  ELSIF v_access_scope = 'team' THEN
    -- Team scope: projects of user's team + subordinates
    RETURN QUERY
      SELECT DISTINCT p.id FROM projects p
      WHERE p.company_id = v_company_id
        AND (
          -- Projects with subordinates
          EXISTS (
            SELECT 1 FROM project_user_access pua
            WHERE pua.project_id = p.id
              AND pua.user_id IN (SELECT * FROM get_subordinate_users(p_user_id))
          )
          OR
          -- Directly assigned
          EXISTS (SELECT 1 FROM project_user_access WHERE project_id = p.id AND user_id = p_user_id)
          OR
          EXISTS (SELECT 1 FROM user_access_assignments WHERE project_id = p.id AND user_id = p_user_id)
        );
        
  ELSE
    -- Assigned scope: only directly assigned projects
    RETURN QUERY
      SELECT DISTINCT p.id FROM projects p
      WHERE 
        EXISTS (SELECT 1 FROM project_user_access WHERE project_id = p.id AND user_id = p_user_id)
        OR
        EXISTS (SELECT 1 FROM user_access_assignments WHERE project_id = p.id AND user_id = p_user_id)
        OR
        -- Projects where user has tasks
        EXISTS (SELECT 1 FROM tasks t WHERE t.project_id = p.id AND t.assigned_to = p_user_id);
  END IF;
END;
$$;

-- 3. Create function to get visible tasks based on hierarchical access
CREATE OR REPLACE FUNCTION public.get_visible_tasks(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access_scope text;
BEGIN
  -- Get user's access scope
  SELECT ucr.access_scope::text INTO v_access_scope
  FROM user_company_roles ucr
  WHERE ucr.user_id = p_user_id
  LIMIT 1;

  IF v_access_scope = 'company' THEN
    -- Company scope: all tasks in visible projects
    RETURN QUERY SELECT t.id FROM tasks t
    WHERE t.project_id IN (SELECT * FROM get_visible_projects(p_user_id));
    
  ELSIF v_access_scope IN ('department', 'team') THEN
    -- Department/Team scope: tasks of subordinates + own + visible projects
    RETURN QUERY
      SELECT DISTINCT t.id FROM tasks t
      WHERE 
        t.assigned_to = p_user_id
        OR t.assigned_to IN (SELECT * FROM get_subordinate_users(p_user_id))
        OR t.project_id IN (SELECT * FROM get_visible_projects(p_user_id));
        
  ELSE
    -- Assigned scope: only own tasks + tasks in assigned projects
    RETURN QUERY
      SELECT DISTINCT t.id FROM tasks t
      WHERE 
        t.assigned_to = p_user_id
        OR t.project_id IN (SELECT * FROM get_visible_projects(p_user_id));
  END IF;
END;
$$;