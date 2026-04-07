
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
    AND status = 'active'
  )
$$;
