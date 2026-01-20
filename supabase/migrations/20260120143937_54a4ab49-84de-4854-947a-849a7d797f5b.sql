-- =============================================
-- COMPREHENSIVE RBAC SYSTEM WITH MULTI-TENANCY
-- =============================================

-- 1. Create new enums (drop old user_status and recreate with new values)
DROP TYPE IF EXISTS public.user_status CASCADE;

CREATE TYPE public.company_role AS ENUM ('super_admin', 'admin', 'manager', 'standard', 'client');
CREATE TYPE public.user_status AS ENUM ('invited', 'pending', 'active', 'suspended', 'deactivated');
CREATE TYPE public.permission_type AS ENUM (
  'users.view', 'users.invite', 'users.edit', 'users.suspend', 'users.delete',
  'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
  'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
  'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.assign',
  'deliverables.view', 'deliverables.create', 'deliverables.edit', 'deliverables.delete', 'deliverables.approve',
  'financials.view', 'financials.create', 'financials.edit', 'financials.delete',
  'reports.view', 'reports.export',
  'tenders.view', 'tenders.create', 'tenders.edit', 'tenders.delete',
  'files.view', 'files.upload', 'files.delete',
  'comments.view', 'comments.create', 'comments.edit', 'comments.delete',
  'settings.company', 'settings.billing', 'settings.security', 'settings.integrations',
  'audit.view'
);
CREATE TYPE public.access_scope AS ENUM ('company', 'assigned');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

-- 2. Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create user_company_roles table
CREATE TABLE public.user_company_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role company_role NOT NULL DEFAULT 'standard',
  status user_status NOT NULL DEFAULT 'pending',
  access_scope access_scope NOT NULL DEFAULT 'assigned',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- 4. Create user_permissions table
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  permission permission_type NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id, permission)
);

-- 5. Create user_access_assignments table
CREATE TABLE public.user_access_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_assignment CHECK (
    (client_id IS NOT NULL AND project_id IS NULL) OR
    (client_id IS NULL AND project_id IS NOT NULL) OR
    (client_id IS NOT NULL AND project_id IS NOT NULL)
  )
);

-- 6. Create invitations table
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role company_role NOT NULL DEFAULT 'standard',
  access_scope access_scope NOT NULL DEFAULT 'assigned',
  permissions permission_type[] DEFAULT '{}',
  client_ids UUID[] DEFAULT '{}',
  project_ids UUID[] DEFAULT '{}',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status invitation_status NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Create rbac_audit_log table
CREATE TABLE public.rbac_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  target_type TEXT NOT NULL,
  target_id UUID,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Add company_id to existing tables
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.tenders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 9. Create indexes
CREATE INDEX idx_user_company_roles_user ON public.user_company_roles(user_id);
CREATE INDEX idx_user_company_roles_company ON public.user_company_roles(company_id);
CREATE INDEX idx_user_permissions_user ON public.user_permissions(user_id);
CREATE INDEX idx_user_access_assignments_user ON public.user_access_assignments(user_id);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_rbac_audit_log_company ON public.rbac_audit_log(company_id);
CREATE INDEX idx_clients_company ON public.clients(company_id);
CREATE INDEX idx_projects_company ON public.projects(company_id);

-- 10. Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_company_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_access_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_audit_log ENABLE ROW LEVEL SECURITY;

-- 11. Security definer functions
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.user_company_roles 
  WHERE user_id = _user_id 
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_role(_user_id UUID, _company_id UUID)
RETURNS company_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_company_roles 
  WHERE user_id = _user_id AND company_id = _company_id
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles 
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles 
    WHERE user_id = _user_id 
    AND company_id = _company_id 
    AND role IN ('super_admin', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission permission_type)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT granted FROM public.user_permissions 
     WHERE user_id = _user_id AND permission = _permission
     LIMIT 1),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.has_client_access(_user_id UUID, _client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    JOIN public.clients c ON c.company_id = ucr.company_id
    WHERE ucr.user_id = _user_id 
    AND c.id = _client_id
    AND ucr.role IN ('super_admin', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    JOIN public.clients c ON c.company_id = ucr.company_id
    WHERE ucr.user_id = _user_id 
    AND c.id = _client_id
    AND ucr.access_scope = 'company'
  ) OR EXISTS (
    SELECT 1 FROM public.user_access_assignments
    WHERE user_id = _user_id AND client_id = _client_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_new_project_access(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    JOIN public.projects p ON p.company_id = ucr.company_id
    WHERE ucr.user_id = _user_id 
    AND p.id = _project_id
    AND ucr.role IN ('super_admin', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    JOIN public.projects p ON p.company_id = ucr.company_id
    WHERE ucr.user_id = _user_id 
    AND p.id = _project_id
    AND ucr.access_scope = 'company'
  ) OR EXISTS (
    SELECT 1 FROM public.user_access_assignments
    WHERE user_id = _user_id AND project_id = _project_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_access_assignments uaa
    JOIN public.projects p ON p.client_id = uaa.client_id
    WHERE uaa.user_id = _user_id AND p.id = _project_id
  )
$$;

-- 12. RLS Policies for companies
CREATE POLICY "Users can view their company"
ON public.companies FOR SELECT
USING (id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid()));

CREATE POLICY "Super admin can update company"
ON public.companies FOR UPDATE
USING (is_super_admin(auth.uid()) AND id = get_user_company_id(auth.uid()));

-- 13. RLS Policies for user_company_roles
CREATE POLICY "Users can view roles in their company"
ON public.user_company_roles FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage roles"
ON public.user_company_roles FOR ALL
USING (is_company_admin(auth.uid(), company_id));

-- 14. RLS Policies for user_permissions
CREATE POLICY "Users can view permissions in their company"
ON public.user_permissions FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage permissions"
ON public.user_permissions FOR ALL
USING (is_company_admin(auth.uid(), company_id));

-- 15. RLS Policies for user_access_assignments
CREATE POLICY "Users can view assignments in their company"
ON public.user_access_assignments FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage assignments"
ON public.user_access_assignments FOR ALL
USING (is_company_admin(auth.uid(), company_id));

-- 16. RLS Policies for invitations
CREATE POLICY "Admins can view invitations"
ON public.invitations FOR SELECT
USING (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins can create invitations"
ON public.invitations FOR INSERT
WITH CHECK (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins can update invitations"
ON public.invitations FOR UPDATE
USING (is_company_admin(auth.uid(), company_id));

-- 17. RLS Policies for rbac_audit_log
CREATE POLICY "Super admin can view audit log"
ON public.rbac_audit_log FOR SELECT
USING (is_super_admin(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "System can insert audit log"
ON public.rbac_audit_log FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- 18. Create triggers
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_company_roles_updated_at
  BEFORE UPDATE ON public.user_company_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 19. Function to accept invitation
CREATE OR REPLACE FUNCTION public.accept_invitation(_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation RECORD;
  _user_id UUID;
  _perm permission_type;
  _client_id UUID;
  _project_id UUID;
BEGIN
  _user_id := auth.uid();
  
  SELECT * INTO _invitation 
  FROM public.invitations 
  WHERE token = _token 
  AND status = 'pending'
  AND expires_at > now();
  
  IF _invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  IF _invitation.email != (SELECT email FROM auth.users WHERE id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email does not match invitation');
  END IF;
  
  INSERT INTO public.user_company_roles (user_id, company_id, role, status, access_scope)
  VALUES (_user_id, _invitation.company_id, _invitation.role, 'active', _invitation.access_scope)
  ON CONFLICT (user_id, company_id) 
  DO UPDATE SET role = _invitation.role, status = 'active', access_scope = _invitation.access_scope;
  
  FOREACH _perm IN ARRAY _invitation.permissions
  LOOP
    INSERT INTO public.user_permissions (user_id, company_id, permission, granted)
    VALUES (_user_id, _invitation.company_id, _perm, true)
    ON CONFLICT (user_id, company_id, permission) DO UPDATE SET granted = true;
  END LOOP;
  
  FOREACH _client_id IN ARRAY _invitation.client_ids
  LOOP
    INSERT INTO public.user_access_assignments (user_id, company_id, client_id)
    VALUES (_user_id, _invitation.company_id, _client_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  FOREACH _project_id IN ARRAY _invitation.project_ids
  LOOP
    INSERT INTO public.user_access_assignments (user_id, company_id, project_id)
    VALUES (_user_id, _invitation.company_id, _project_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  UPDATE public.invitations SET status = 'accepted', accepted_at = now() WHERE id = _invitation.id;
  
  INSERT INTO public.rbac_audit_log (company_id, actor_id, action, target_user_id, target_type, new_value)
  VALUES (_invitation.company_id, _user_id, 'invitation_accepted', _user_id, 'user', 
    jsonb_build_object('role', _invitation.role, 'access_scope', _invitation.access_scope));
  
  RETURN jsonb_build_object('success', true, 'company_id', _invitation.company_id);
END;
$$;