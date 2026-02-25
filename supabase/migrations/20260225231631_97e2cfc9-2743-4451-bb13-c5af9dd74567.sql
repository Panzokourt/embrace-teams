
CREATE OR REPLACE FUNCTION public.auto_onboard_user()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _email TEXT;
  _domain TEXT;
  _full_name TEXT;
  _company_id UUID;
  _company_name TEXT;
  _existing_role_count INT;
  _existing_request_count INT;
  _invitation RECORD;
  _perm permission_type;
  _client_id UUID;
  _project_id UUID;
  _personal_domains TEXT[] := ARRAY[
    'gmail.com','gmail.gr','googlemail.com',
    'yahoo.com','yahoo.gr','yahoo.co.uk',
    'hotmail.com','hotmail.gr','hotmail.co.uk',
    'outlook.com','outlook.gr',
    'live.com','live.gr','windowslive.com',
    'icloud.com','me.com',
    'protonmail.com','proton.me',
    'aol.com','mail.com','zoho.com',
    'yandex.com','yandex.ru',
    'msn.com','inbox.com',
    'gmx.com','gmx.de','gmx.net'
  ];
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

  -- ===== STEP 1: Check for pending invitation FIRST =====
  SELECT * INTO _invitation
  FROM public.invitations
  WHERE email = _email
  AND status = 'pending'
  AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF _invitation.id IS NOT NULL THEN
    -- Auto-accept the invitation
    INSERT INTO public.user_company_roles (user_id, company_id, role, status, access_scope)
    VALUES (_user_id, _invitation.company_id, _invitation.role, 'active', _invitation.access_scope)
    ON CONFLICT (user_id, company_id)
    DO UPDATE SET role = _invitation.role, status = 'active', access_scope = _invitation.access_scope;

    -- Apply permissions from invitation
    IF _invitation.permissions IS NOT NULL THEN
      FOREACH _perm IN ARRAY _invitation.permissions
      LOOP
        INSERT INTO public.user_permissions (user_id, company_id, permission, granted)
        VALUES (_user_id, _invitation.company_id, _perm, true)
        ON CONFLICT (user_id, company_id, permission) DO UPDATE SET granted = true;
      END LOOP;
    END IF;

    -- Apply client access
    IF _invitation.client_ids IS NOT NULL THEN
      FOREACH _client_id IN ARRAY _invitation.client_ids
      LOOP
        INSERT INTO public.user_access_assignments (user_id, company_id, client_id)
        VALUES (_user_id, _invitation.company_id, _client_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    -- Apply project access
    IF _invitation.project_ids IS NOT NULL THEN
      FOREACH _project_id IN ARRAY _invitation.project_ids
      LOOP
        INSERT INTO public.user_access_assignments (user_id, company_id, project_id)
        VALUES (_user_id, _invitation.company_id, _project_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    -- Mark invitation as accepted
    UPDATE public.invitations SET status = 'accepted', accepted_at = now() WHERE id = _invitation.id;

    -- Update profile status
    UPDATE public.profiles SET status = 'active' WHERE id = _user_id;

    -- Add legacy role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'employee')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Audit log
    INSERT INTO public.rbac_audit_log (company_id, actor_id, action, target_user_id, target_type, new_value)
    VALUES (_invitation.company_id, _user_id, 'invitation_auto_accepted', _user_id, 'user',
      jsonb_build_object('role', _invitation.role, 'access_scope', _invitation.access_scope));

    -- Get company name
    SELECT name INTO _company_name FROM public.companies WHERE id = _invitation.company_id;

    RETURN jsonb_build_object(
      'action', 'invitation_accepted',
      'company_id', _invitation.company_id,
      'company_name', _company_name
    );
  END IF;

  -- ===== STEP 2: Check if user already has a company role =====
  SELECT COUNT(*) INTO _existing_role_count
  FROM public.user_company_roles WHERE user_id = _user_id;

  IF _existing_role_count > 0 THEN
    RETURN jsonb_build_object('action', 'already_member');
  END IF;

  -- ===== STEP 3: Check if personal email =====
  IF _domain = ANY(_personal_domains) THEN
    RETURN jsonb_build_object('action', 'personal_email');
  END IF;

  -- ===== STEP 4: Check if company with this domain exists =====
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
$function$;
