
-- Phase 1A continued: Migrate existing data to new roles
UPDATE user_company_roles SET role = 'owner' WHERE role = 'super_admin';
UPDATE user_company_roles SET role = 'member' WHERE role = 'standard';
-- Note: 'client' role rows can stay for now, they won't break anything

-- Phase 1B: Create join_requests table
CREATE TABLE public.join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own join requests"
  ON public.join_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create join requests
CREATE POLICY "Users can create join requests"
  ON public.join_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins/Owners can view company join requests
CREATE POLICY "Admins can view company join requests"
  ON public.join_requests FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()) AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid() AND company_id = join_requests.company_id
    AND role IN ('owner', 'admin')
  ));

-- Admins/Owners can update (approve/reject) join requests
CREATE POLICY "Admins can manage join requests"
  ON public.join_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid() AND company_id = join_requests.company_id
    AND role IN ('owner', 'admin')
  ));

-- Phase 1C: Extend companies table
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS sso_enforced BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS allow_domain_requests BOOLEAN NOT NULL DEFAULT true;

-- Phase 1D: Update security functions to use 'owner' instead of 'super_admin'
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles 
    WHERE user_id = _user_id AND role IN ('owner', 'super_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id uuid, _company_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles 
    WHERE user_id = _user_id 
    AND company_id = _company_id 
    AND role IN ('owner', 'super_admin', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role IN ('admin', 'manager')
    ) OR EXISTS (
      SELECT 1 FROM public.user_company_roles
      WHERE user_id = _user_id AND role IN ('owner', 'super_admin', 'admin', 'manager')
    )
  END
$$;

-- Allow companies to be inserted by authenticated users (for creating new orgs)
CREATE POLICY "Authenticated users can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Function to create a company and assign owner role
CREATE OR REPLACE FUNCTION public.create_company_with_owner(
  _name TEXT,
  _domain TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id UUID;
  _user_id UUID;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Create company
  INSERT INTO public.companies (name, domain)
  VALUES (_name, _domain)
  RETURNING id INTO _company_id;
  
  -- Create owner role
  INSERT INTO public.user_company_roles (user_id, company_id, role, status, access_scope)
  VALUES (_user_id, _company_id, 'owner', 'active', 'company');
  
  -- Update profile status to active
  UPDATE public.profiles SET status = 'active' WHERE id = _user_id;
  
  -- Add legacy admin role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN _company_id;
END;
$$;

-- Function to find companies by email domain
CREATE OR REPLACE FUNCTION public.find_companies_by_domain(_domain TEXT)
RETURNS TABLE(id UUID, name TEXT, logo_url TEXT, allow_domain_requests BOOLEAN)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.logo_url, c.allow_domain_requests
  FROM public.companies c
  WHERE c.domain = _domain
  AND c.allow_domain_requests = true;
$$;
