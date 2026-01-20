-- Migration: Migrate existing users to new RBAC system
-- Create a default company for existing data
INSERT INTO public.companies (id, name, domain)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Company', 'default.local')
ON CONFLICT (domain) DO NOTHING;

-- Migrate existing clients to default company
UPDATE public.clients 
SET company_id = '00000000-0000-0000-0000-000000000001' 
WHERE company_id IS NULL;

-- Migrate existing projects to default company
UPDATE public.projects 
SET company_id = '00000000-0000-0000-0000-000000000001' 
WHERE company_id IS NULL;

-- Migrate existing tenders to default company
UPDATE public.tenders 
SET company_id = '00000000-0000-0000-0000-000000000001' 
WHERE company_id IS NULL;

-- Migrate existing teams to default company
UPDATE public.teams 
SET company_id = '00000000-0000-0000-0000-000000000001' 
WHERE company_id IS NULL;

-- Create function to migrate users
CREATE OR REPLACE FUNCTION public.migrate_existing_users_to_rbac()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_record RECORD;
  _legacy_role TEXT;
  _new_role company_role;
  _perm permission_type;
BEGIN
  -- Loop through all profiles
  FOR _user_record IN SELECT id, email FROM public.profiles LOOP
    -- Check if user already has a company role
    IF NOT EXISTS (SELECT 1 FROM public.user_company_roles WHERE user_id = _user_record.id) THEN
      
      -- Get legacy role
      SELECT role INTO _legacy_role FROM public.user_roles WHERE user_id = _user_record.id LIMIT 1;
      
      -- Map legacy role to new role
      _new_role := CASE _legacy_role
        WHEN 'admin' THEN 'super_admin'::company_role  -- First admin becomes super_admin
        WHEN 'manager' THEN 'manager'::company_role
        WHEN 'employee' THEN 'standard'::company_role
        WHEN 'client' THEN 'client'::company_role
        ELSE 'standard'::company_role
      END;
      
      -- Insert into user_company_roles
      INSERT INTO public.user_company_roles (user_id, company_id, role, status, access_scope)
      VALUES (
        _user_record.id,
        '00000000-0000-0000-0000-000000000001',
        _new_role,
        'active'::user_status,
        CASE WHEN _new_role IN ('super_admin', 'admin') THEN 'company'::access_scope ELSE 'assigned'::access_scope END
      )
      ON CONFLICT (user_id, company_id) DO NOTHING;
      
      -- Grant default permissions based on role
      IF _new_role = 'super_admin' THEN
        -- Super admin gets all permissions
        FOR _perm IN SELECT unnest(enum_range(NULL::permission_type)) LOOP
          INSERT INTO public.user_permissions (user_id, company_id, permission, granted)
          VALUES (_user_record.id, '00000000-0000-0000-0000-000000000001', _perm, true)
          ON CONFLICT (user_id, company_id, permission) DO NOTHING;
        END LOOP;
      ELSIF _new_role = 'admin' THEN
        -- Admin gets most permissions
        FOR _perm IN SELECT unnest(enum_range(NULL::permission_type)) LOOP
          IF _perm::text NOT LIKE 'settings.billing%' AND _perm::text NOT LIKE 'settings.security%' THEN
            INSERT INTO public.user_permissions (user_id, company_id, permission, granted)
            VALUES (_user_record.id, '00000000-0000-0000-0000-000000000001', _perm, true)
            ON CONFLICT (user_id, company_id, permission) DO NOTHING;
          END IF;
        END LOOP;
      ELSIF _new_role = 'manager' THEN
        -- Manager permissions
        FOR _perm IN 
          SELECT unnest(ARRAY[
            'clients.view', 'projects.view', 'projects.edit',
            'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.assign',
            'deliverables.view', 'deliverables.create', 'deliverables.edit', 'deliverables.delete',
            'files.view', 'files.upload', 'files.delete',
            'comments.view', 'comments.create', 'comments.edit', 'comments.delete',
            'reports.view'
          ]::permission_type[])
        LOOP
          INSERT INTO public.user_permissions (user_id, company_id, permission, granted)
          VALUES (_user_record.id, '00000000-0000-0000-0000-000000000001', _perm, true)
          ON CONFLICT (user_id, company_id, permission) DO NOTHING;
        END LOOP;
      ELSIF _new_role = 'standard' THEN
        -- Standard permissions
        FOR _perm IN 
          SELECT unnest(ARRAY[
            'clients.view', 'projects.view',
            'tasks.view', 'tasks.create', 'tasks.edit',
            'deliverables.view',
            'files.view', 'files.upload',
            'comments.view', 'comments.create', 'comments.edit'
          ]::permission_type[])
        LOOP
          INSERT INTO public.user_permissions (user_id, company_id, permission, granted)
          VALUES (_user_record.id, '00000000-0000-0000-0000-000000000001', _perm, true)
          ON CONFLICT (user_id, company_id, permission) DO NOTHING;
        END LOOP;
      ELSIF _new_role = 'client' THEN
        -- Client permissions
        FOR _perm IN 
          SELECT unnest(ARRAY[
            'projects.view',
            'deliverables.view', 'deliverables.approve',
            'files.view',
            'comments.view', 'comments.create'
          ]::permission_type[])
        LOOP
          INSERT INTO public.user_permissions (user_id, company_id, permission, granted)
          VALUES (_user_record.id, '00000000-0000-0000-0000-000000000001', _perm, true)
          ON CONFLICT (user_id, company_id, permission) DO NOTHING;
        END LOOP;
      END IF;
      
      -- Migrate project access assignments
      INSERT INTO public.user_access_assignments (user_id, company_id, project_id)
      SELECT _user_record.id, '00000000-0000-0000-0000-000000000001', project_id
      FROM public.project_user_access
      WHERE user_id = _user_record.id
      ON CONFLICT DO NOTHING;
      
      -- Migrate client access assignments
      INSERT INTO public.user_access_assignments (user_id, company_id, client_id)
      SELECT _user_record.id, '00000000-0000-0000-0000-000000000001', client_id
      FROM public.client_user_access
      WHERE user_id = _user_record.id
      ON CONFLICT DO NOTHING;
      
    END IF;
  END LOOP;
END;
$$;

-- Run the migration
SELECT public.migrate_existing_users_to_rbac();

-- Drop the migration function (one-time use)
DROP FUNCTION IF EXISTS public.migrate_existing_users_to_rbac();