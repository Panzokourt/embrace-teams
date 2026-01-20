-- ============================================
-- SECURITY FIX: Add authentication requirements to RLS policies
-- ============================================

-- 1. Update profiles policies to require authentication and company scope
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin/Manager can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Users can view profiles in their company" 
ON public.profiles FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND id IN (
    SELECT ucr.user_id 
    FROM public.user_company_roles ucr 
    WHERE ucr.company_id = get_user_company_id(auth.uid())
  )
);

-- 2. Update invitations policies - ensure company scope and allow invited users to see their invitation
DROP POLICY IF EXISTS "Admins can view invitations" ON public.invitations;

CREATE POLICY "Admins can view company invitations" 
ON public.invitations FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_company_admin(auth.uid(), company_id)
);

-- Allow users to view invitation sent to their email (for accepting)
CREATE POLICY "Users can view their own invitations" 
ON public.invitations FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 3. Update projects policies to require authentication
DROP POLICY IF EXISTS "Users can view projects they have access to" ON public.projects;
DROP POLICY IF EXISTS "Clients can view their projects" ON public.projects;

CREATE POLICY "Users can view projects they have access to" 
ON public.projects FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND has_project_access(auth.uid(), id)
);

CREATE POLICY "Clients can view their projects" 
ON public.projects FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM client_user_access cua
    WHERE cua.user_id = auth.uid() AND cua.client_id = projects.client_id
  )
);

-- 4. Update clients policies to include company scope check
DROP POLICY IF EXISTS "Admin/Manager can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Admin/Manager can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Client users can view their organization" ON public.clients;

CREATE POLICY "Admin/Manager can view company clients" 
ON public.clients FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_admin_or_manager(auth.uid())
  AND (company_id IS NULL OR company_id = get_user_company_id(auth.uid()))
);

CREATE POLICY "Admin/Manager can manage company clients" 
ON public.clients FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND is_admin_or_manager(auth.uid())
  AND (company_id IS NULL OR company_id = get_user_company_id(auth.uid()))
);

CREATE POLICY "Client users can view their organization" 
ON public.clients FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM client_user_access
    WHERE client_user_access.client_id = clients.id 
    AND client_user_access.user_id = auth.uid()
  )
);

-- 5. Update tenders policies to include company scope
DROP POLICY IF EXISTS "Admin/Manager can view tenders" ON public.tenders;
DROP POLICY IF EXISTS "Admin/Manager can manage tenders" ON public.tenders;

CREATE POLICY "Admin/Manager can view company tenders" 
ON public.tenders FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_admin_or_manager(auth.uid())
  AND (company_id IS NULL OR company_id = get_user_company_id(auth.uid()))
);

CREATE POLICY "Admin/Manager can manage company tenders" 
ON public.tenders FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND is_admin_or_manager(auth.uid())
  AND (company_id IS NULL OR company_id = get_user_company_id(auth.uid()))
);

-- 6. Update teams policies to include company scope
DROP POLICY IF EXISTS "Active users can view teams" ON public.teams;
DROP POLICY IF EXISTS "Admin/Manager can manage teams" ON public.teams;

CREATE POLICY "Active users can view company teams" 
ON public.teams FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_active_user(auth.uid())
  AND (company_id IS NULL OR company_id = get_user_company_id(auth.uid()))
);

CREATE POLICY "Admin/Manager can manage company teams" 
ON public.teams FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND is_admin_or_manager(auth.uid())
  AND (company_id IS NULL OR company_id = get_user_company_id(auth.uid()))
);

-- 7. Update deliverables policies to require auth
DROP POLICY IF EXISTS "Users can view deliverables for their projects" ON public.deliverables;

CREATE POLICY "Users can view deliverables for their projects" 
ON public.deliverables FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND has_project_access(auth.uid(), project_id)
);

-- 8. Update tasks policies to require auth  
DROP POLICY IF EXISTS "Users can view tasks for their projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can view their assigned tasks" ON public.tasks;

CREATE POLICY "Users can view tasks for their projects" 
ON public.tasks FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND has_project_access(auth.uid(), project_id)
);

CREATE POLICY "Users can view their assigned tasks" 
ON public.tasks FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = assigned_to
);

-- 9. Update media_plan_items policies to require auth
DROP POLICY IF EXISTS "Users can view media plan items for their projects" ON public.media_plan_items;

CREATE POLICY "Users can view media plan items for their projects" 
ON public.media_plan_items FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND has_project_access(auth.uid(), project_id)
);

-- 10. Update invoices policies to require auth
DROP POLICY IF EXISTS "Admin/Manager can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Clients can view their invoices" ON public.invoices;

CREATE POLICY "Admin/Manager can view invoices" 
ON public.invoices FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_admin_or_manager(auth.uid())
);

CREATE POLICY "Clients can view their invoices" 
ON public.invoices FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM client_user_access cua
    WHERE cua.user_id = auth.uid() AND cua.client_id = invoices.client_id
  )
);

-- 11. Update expenses policies to require auth
DROP POLICY IF EXISTS "Admin/Manager can view expenses" ON public.expenses;

CREATE POLICY "Admin/Manager can view expenses" 
ON public.expenses FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_admin_or_manager(auth.uid())
);