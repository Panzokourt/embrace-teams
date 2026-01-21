-- ============================================
-- PHASE 1A: Schema Changes (without new enum usage)
-- ============================================

-- 1. Extend access_scope enum with new values
ALTER TYPE access_scope ADD VALUE IF NOT EXISTS 'department';
ALTER TYPE access_scope ADD VALUE IF NOT EXISTS 'team';

-- 2. Create departments table for proper department management
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  head_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  parent_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  color text DEFAULT '#3B82F6',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

-- 3. Add team_lead_id to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_lead_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 4. Add department_id to profiles for proper linking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE SET NULL;

-- 5. Enable RLS on departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for departments
CREATE POLICY "Users can view departments in their company"
ON public.departments FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admin/Manager can manage departments"
ON public.departments FOR ALL
USING (is_admin_or_manager(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- 7. Create function to get all subordinate users (recursive)
CREATE OR REPLACE FUNCTION public.get_subordinate_users(manager_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE subordinates AS (
    -- Direct reports via reports_to
    SELECT p.id as user_id
    FROM profiles p
    WHERE p.reports_to = manager_id
    
    UNION
    
    -- Team members if user is team lead
    SELECT tm.user_id
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE t.team_lead_id = manager_id
    
    UNION
    
    -- Recursive: subordinates of subordinates
    SELECT p.id
    FROM profiles p
    JOIN subordinates s ON p.reports_to = s.user_id
  )
  SELECT DISTINCT user_id FROM subordinates;
$$;

-- 8. Create function to get department members
CREATE OR REPLACE FUNCTION public.get_department_users(dept_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE dept_tree AS (
    -- The department itself
    SELECT id FROM departments WHERE id = dept_id
    UNION
    -- Child departments
    SELECT d.id FROM departments d
    JOIN dept_tree dt ON d.parent_department_id = dt.id
  )
  SELECT DISTINCT p.id as user_id
  FROM profiles p
  WHERE p.department_id IN (SELECT id FROM dept_tree);
$$;

-- 9. Update trigger for departments updated_at
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();