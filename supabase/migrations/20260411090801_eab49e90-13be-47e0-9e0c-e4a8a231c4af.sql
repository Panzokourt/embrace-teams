
-- 1. Create table FIRST
CREATE TABLE public.client_portal_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invited_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, client_id)
);

ALTER TABLE public.client_portal_users ENABLE ROW LEVEL SECURITY;

-- 2. Helper functions
CREATE OR REPLACE FUNCTION public.is_portal_user(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_portal_users
    WHERE user_id = _user_id AND client_id = _client_id AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.get_portal_client_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT client_id FROM public.client_portal_users
  WHERE user_id = _user_id AND is_active = true
$$;

-- 3. RLS on client_portal_users
CREATE POLICY "Portal users can view own access"
  ON public.client_portal_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Company admins can view portal users"
  ON public.client_portal_users FOR SELECT
  USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can insert portal users"
  ON public.client_portal_users FOR INSERT
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can update portal users"
  ON public.client_portal_users FOR UPDATE
  USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company admins can delete portal users"
  ON public.client_portal_users FOR DELETE
  USING (public.is_company_admin(auth.uid(), company_id));

CREATE TRIGGER update_client_portal_users_updated_at
  BEFORE UPDATE ON public.client_portal_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Portal read-only policies on existing tables
CREATE POLICY "Portal users can view client projects"
  ON public.projects FOR SELECT
  USING (client_id IN (SELECT public.get_portal_client_ids(auth.uid())));

CREATE POLICY "Portal users can view client invoices"
  ON public.invoices FOR SELECT
  USING (project_id IN (
    SELECT id FROM public.projects WHERE client_id IN (SELECT public.get_portal_client_ids(auth.uid()))
  ));

CREATE POLICY "Portal users can view client deliverables"
  ON public.deliverables FOR SELECT
  USING (project_id IN (
    SELECT id FROM public.projects WHERE client_id IN (SELECT public.get_portal_client_ids(auth.uid()))
  ));

CREATE POLICY "Portal users can view client files"
  ON public.file_attachments FOR SELECT
  USING (project_id IN (
    SELECT id FROM public.projects WHERE client_id IN (SELECT public.get_portal_client_ids(auth.uid()))
  ));

CREATE POLICY "Portal users can view their client"
  ON public.clients FOR SELECT
  USING (id IN (SELECT public.get_portal_client_ids(auth.uid())));
