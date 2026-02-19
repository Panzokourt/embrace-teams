
-- Function: auto_onboard_user
-- Called from Onboarding page. Checks email domain and:
-- 1. Personal email → returns 'personal_email'
-- 2. Corporate email, no company with that domain → creates company + owner role → 'created_company'
-- 3. Corporate email, company exists → creates join_request → 'join_requested'
-- 4. Already has a pending join request → 'already_requested'

CREATE OR REPLACE FUNCTION public.auto_onboard_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID;
  _email TEXT;
  _domain TEXT;
  _full_name TEXT;
  _company_id UUID;
  _company_name TEXT;
  _existing_role_count INT;
  _existing_request_count INT;
  _personal_domains TEXT[] := ARRAY['gmail.com','yahoo.com','hotmail.com','outlook.com','live.com','icloud.com','yahoo.gr','hotmail.gr','googlemail.com','protonmail.com','aol.com','mail.com','zoho.com'];
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user email
  SELECT email, full_name INTO _email, _full_name
  FROM public.profiles WHERE id = _user_id;

  IF _email IS NULL THEN
    RETURN jsonb_build_object('action', 'error', 'message', 'Profile not found');
  END IF;

  -- Extract domain
  _domain := split_part(_email, '@', 2);

  -- Check if personal email
  IF _domain = ANY(_personal_domains) THEN
    RETURN jsonb_build_object('action', 'personal_email');
  END IF;

  -- Check if user already has a company role
  SELECT COUNT(*) INTO _existing_role_count
  FROM public.user_company_roles WHERE user_id = _user_id;

  IF _existing_role_count > 0 THEN
    RETURN jsonb_build_object('action', 'already_member');
  END IF;

  -- Check if company with this domain exists
  SELECT id, name INTO _company_id, _company_name
  FROM public.companies WHERE domain = _domain LIMIT 1;

  IF _company_id IS NULL THEN
    -- No company exists: create company + owner role
    INSERT INTO public.companies (name, domain)
    VALUES (initcap(split_part(_domain, '.', 1)), _domain)
    RETURNING id INTO _company_id;

    INSERT INTO public.user_company_roles (user_id, company_id, role, status, access_scope)
    VALUES (_user_id, _company_id, 'owner', 'active', 'company');

    UPDATE public.profiles SET status = 'active' WHERE id = _user_id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN jsonb_build_object(
      'action', 'created_company',
      'company_id', _company_id,
      'company_name', initcap(split_part(_domain, '.', 1))
    );
  ELSE
    -- Company exists: check for existing join request
    SELECT COUNT(*) INTO _existing_request_count
    FROM public.join_requests
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'pending';

    IF _existing_request_count > 0 THEN
      RETURN jsonb_build_object('action', 'already_requested', 'company_name', _company_name);
    END IF;

    -- Create join request
    INSERT INTO public.join_requests (user_id, company_id, status)
    VALUES (_user_id, _company_id, 'pending');

    RETURN jsonb_build_object(
      'action', 'join_requested',
      'company_id', _company_id,
      'company_name', _company_name
    );
  END IF;
END;
$$;

-- Function to approve a join request (used by admins)
CREATE OR REPLACE FUNCTION public.approve_join_request(_request_id uuid, _role company_role DEFAULT 'standard')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _actor_id UUID;
  _request RECORD;
BEGIN
  _actor_id := auth.uid();
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the request
  SELECT * INTO _request FROM public.join_requests WHERE id = _request_id AND status = 'pending';
  IF _request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or already processed');
  END IF;

  -- Verify actor is admin/owner of the company
  IF NOT is_company_admin(_actor_id, _request.company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Create company role for the user
  INSERT INTO public.user_company_roles (user_id, company_id, role, status, access_scope)
  VALUES (_request.user_id, _request.company_id, _role, 'active', 'assigned')
  ON CONFLICT (user_id, company_id) DO UPDATE SET role = _role, status = 'active';

  -- Update profile status
  UPDATE public.profiles SET status = 'active' WHERE id = _request.user_id;

  -- Add legacy member role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_request.user_id, 'employee')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Update request
  UPDATE public.join_requests
  SET status = 'approved', reviewed_by = _actor_id, reviewed_at = now()
  WHERE id = _request_id;

  -- Audit log
  INSERT INTO public.rbac_audit_log (company_id, actor_id, action, target_user_id, target_type, new_value)
  VALUES (_request.company_id, _actor_id, 'join_request_approved', _request.user_id, 'user',
    jsonb_build_object('role', _role));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to reject a join request
CREATE OR REPLACE FUNCTION public.reject_join_request(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _actor_id UUID;
  _request RECORD;
BEGIN
  _actor_id := auth.uid();
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _request FROM public.join_requests WHERE id = _request_id AND status = 'pending';
  IF _request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or already processed');
  END IF;

  IF NOT is_company_admin(_actor_id, _request.company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE public.join_requests
  SET status = 'rejected', reviewed_by = _actor_id, reviewed_at = now()
  WHERE id = _request_id;

  INSERT INTO public.rbac_audit_log (company_id, actor_id, action, target_user_id, target_type)
  VALUES (_request.company_id, _actor_id, 'join_request_rejected', _request.user_id, 'user');

  RETURN jsonb_build_object('success', true);
END;
$$;
