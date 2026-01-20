-- Fix STORAGE_EXPOSURE: Update storage policies with proper project access checks
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete project files" ON storage.objects;

-- Create improved SELECT policy that validates project access via file_attachments table
CREATE POLICY "Users can view files from their projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files' AND 
  (
    -- Admin/Manager can view all files
    is_admin_or_manager(auth.uid()) OR
    -- Users can view files they uploaded
    (storage.foldername(name))[1] = auth.uid()::text OR
    -- Users can view files from projects they have access to
    EXISTS (
      SELECT 1 FROM file_attachments fa
      WHERE fa.file_path = name
      AND (
        (fa.project_id IS NOT NULL AND has_project_access(auth.uid(), fa.project_id)) OR
        (fa.task_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM tasks t WHERE t.id = fa.task_id AND has_project_access(auth.uid(), t.project_id)
        )) OR
        (fa.deliverable_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM deliverables d WHERE d.id = fa.deliverable_id AND has_project_access(auth.uid(), d.project_id)
        ))
      )
    )
  )
);

-- Create improved INSERT policy that validates active user status
CREATE POLICY "Active users can upload project files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-files' AND 
  is_active_user(auth.uid()) AND
  -- First folder must be user's ID
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create improved UPDATE policy 
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-files' AND 
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'project-files' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create improved DELETE policy
CREATE POLICY "Users can delete their own files or admins"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-files' AND 
  (
    is_admin_or_manager(auth.uid()) OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Fix DEFINER_OR_RPC_BYPASS: Add NULL checks and improve input validation to helper functions

-- Improve has_role function with NULL checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL OR _role IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    )
  END
$$;

-- Improve is_admin_or_manager function with NULL check
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role IN ('admin', 'manager')
    )
  END
$$;

-- Improve has_project_access function with NULL check
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL OR _project_id IS NULL THEN false
    ELSE (
      -- Check direct user access
      EXISTS (
        SELECT 1 FROM public.project_user_access
        WHERE user_id = _user_id AND project_id = _project_id
      )
      OR
      -- Check team access
      EXISTS (
        SELECT 1 FROM public.project_team_access pta
        JOIN public.team_members tm ON tm.team_id = pta.team_id
        WHERE pta.project_id = _project_id AND tm.user_id = _user_id
      )
      OR
      -- Admin/Manager has access to all projects
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role IN ('admin', 'manager')
      )
      OR
      -- Client has access to their projects via client_user_access
      EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.client_user_access cua ON cua.client_id = p.client_id
        WHERE p.id = _project_id AND cua.user_id = _user_id
      )
    )
  END
$$;

-- Improve is_active_user function with NULL check  
CREATE OR REPLACE FUNCTION public.is_active_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = _user_id AND status = 'active'
    )
  END
$$;