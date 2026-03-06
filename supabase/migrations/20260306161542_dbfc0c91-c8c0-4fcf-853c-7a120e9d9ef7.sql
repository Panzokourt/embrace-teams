
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
  _is_personal BOOLEAN;
  _domain_companies JSONB;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email, full_name INTO _email, _full_name
  FROM public.profiles WHERE id = _user_id;

  IF _email IS NULL THEN
    RETURN jsonb_build_object('action', 'error', 'message', 'Profile not found');
  END IF;

  _domain := split_part(_email, '@', 2);
  _is_personal := _domain = ANY(_personal_domains);

  -- ===== STEP 1: Check for pending invitation FIRST =====
  SELECT * INTO _invitation
  FROM public.invitations
  WHERE email = _email
  AND status = 'pending'
  AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF _invitation.id IS NOT NULL THEN
    INSERT INTO public.user_company_roles (user_id, company_id, role, status, access_scope)
    VALUES (_user_id, _invitation.company_id, _invitation.role, 'active', _invitation.access_scope)
    ON CONFLICT (user_id, company_id)
    DO UPDATE SET role = _invitation.role, status = 'active', access_scope = _invitation.access_scope;

    IF _invitation.permissions IS NOT NULL THEN
      FOREACH _perm IN ARRAY _invitation.permissions
      LOOP
        INSERT INTO public.user_permissions (user_id, company_id, permission, granted)
        VALUES (_user_id, _invitation.company_id, _perm, true)
        ON CONFLICT (user_id, company_id, permission) DO UPDATE SET granted = true;
      END LOOP;
    END IF;

    IF _invitation.client_ids IS NOT NULL THEN
      FOREACH _client_id IN ARRAY _invitation.client_ids
      LOOP
        INSERT INTO public.user_access_assignments (user_id, company_id, client_id)
        VALUES (_user_id, _invitation.company_id, _client_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    IF _invitation.project_ids IS NOT NULL THEN
      FOREACH _project_id IN ARRAY _invitation.project_ids
      LOOP
        INSERT INTO public.user_access_assignments (user_id, company_id, project_id)
        VALUES (_user_id, _invitation.company_id, _project_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    UPDATE public.invitations SET status = 'accepted', accepted_at = now() WHERE id = _invitation.id;
    UPDATE public.profiles SET status = 'active' WHERE id = _user_id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'employee')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.rbac_audit_log (company_id, actor_id, action, target_user_id, target_type, new_value)
    VALUES (_invitation.company_id, _user_id, 'invitation_auto_accepted', _user_id, 'user',
      jsonb_build_object('role', _invitation.role, 'access_scope', _invitation.access_scope));

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

  -- ===== STEP 3: Return needs_onboarding with domain info =====
  -- No longer auto-create companies or join requests. Let the wizard handle it.
  
  IF NOT _is_personal THEN
    -- Find matching companies for the domain
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'logo_url', c.logo_url
    )), '[]'::jsonb)
    INTO _domain_companies
    FROM public.companies c
    WHERE c.domain = _domain AND c.allow_domain_requests = true;
  ELSE
    _domain_companies := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'action', 'needs_onboarding',
    'domain', _domain,
    'is_personal_email', _is_personal,
    'domain_companies', _domain_companies,
    'suggested_company_name', CASE WHEN NOT _is_personal THEN initcap(split_part(_domain, '.', 1)) ELSE NULL END
  );
END;
$function$;
