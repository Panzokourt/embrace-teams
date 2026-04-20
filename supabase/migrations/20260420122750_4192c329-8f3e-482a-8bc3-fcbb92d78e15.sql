-- Table: client_portal_access_tokens
CREATE TABLE IF NOT EXISTS public.client_portal_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_id uuid,
  token_hash text NOT NULL UNIQUE,
  pin_hash text,
  require_pin boolean NOT NULL DEFAULT false,
  pin_attempts integer NOT NULL DEFAULT 0,
  pin_locked_until timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cpat_token_hash ON public.client_portal_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_cpat_company ON public.client_portal_access_tokens(company_id);
CREATE INDEX IF NOT EXISTS idx_cpat_client ON public.client_portal_access_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_cpat_email ON public.client_portal_access_tokens(lower(email));

ALTER TABLE public.client_portal_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view portal tokens"
  ON public.client_portal_access_tokens FOR SELECT
  USING (public.is_company_admin_or_manager(auth.uid(), company_id));

CREATE POLICY "Company admins can insert portal tokens"
  ON public.client_portal_access_tokens FOR INSERT
  WITH CHECK (public.is_company_admin_or_manager(auth.uid(), company_id));

CREATE POLICY "Company admins can update portal tokens"
  ON public.client_portal_access_tokens FOR UPDATE
  USING (public.is_company_admin_or_manager(auth.uid(), company_id));

CREATE POLICY "Company admins can delete portal tokens"
  ON public.client_portal_access_tokens FOR DELETE
  USING (public.is_company_admin_or_manager(auth.uid(), company_id));

-- Helper: hash a token (sha256 hex) — use extensions schema for digest
CREATE OR REPLACE FUNCTION public._hash_token(_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.digest(_token, 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.portal_create_token(
  _client_id uuid,
  _company_id uuid,
  _email text,
  _user_id uuid,
  _token text,
  _pin text DEFAULT NULL,
  _expires_in_days integer DEFAULT 30
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _token_hash text;
  _pin_hash text;
  _require_pin boolean;
BEGIN
  _token_hash := public._hash_token(_token);
  _require_pin := _pin IS NOT NULL;
  IF _require_pin THEN
    _pin_hash := public._hash_token(_pin);
  END IF;

  UPDATE public.client_portal_access_tokens
  SET revoked_at = now()
  WHERE client_id = _client_id
    AND lower(email) = lower(_email)
    AND revoked_at IS NULL;

  INSERT INTO public.client_portal_access_tokens (
    client_id, company_id, email, user_id, token_hash, pin_hash, require_pin,
    expires_at, created_by
  ) VALUES (
    _client_id, _company_id, lower(_email), _user_id, _token_hash, _pin_hash, _require_pin,
    now() + (_expires_in_days || ' days')::interval, auth.uid()
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_validate_token(_token text, _pin text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.client_portal_access_tokens%ROWTYPE;
  _client_name text;
  _company_name text;
BEGIN
  SELECT * INTO _row
  FROM public.client_portal_access_tokens
  WHERE token_hash = public._hash_token(_token)
  LIMIT 1;

  IF _row.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'invalid_token');
  END IF;
  IF _row.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'revoked');
  END IF;
  IF _row.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'expired');
  END IF;
  IF _row.pin_locked_until IS NOT NULL AND _row.pin_locked_until > now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'locked', 'locked_until', _row.pin_locked_until);
  END IF;

  SELECT name INTO _client_name FROM public.clients WHERE id = _row.client_id;
  SELECT name INTO _company_name FROM public.companies WHERE id = _row.company_id;

  IF _row.require_pin THEN
    IF _pin IS NULL THEN
      RETURN jsonb_build_object(
        'valid', false, 'requires_pin', true,
        'client_name', _client_name, 'company_name', _company_name
      );
    END IF;
    IF public._hash_token(_pin) <> _row.pin_hash THEN
      UPDATE public.client_portal_access_tokens
      SET pin_attempts = pin_attempts + 1,
          pin_locked_until = CASE WHEN pin_attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE pin_locked_until END
      WHERE id = _row.id;
      RETURN jsonb_build_object('valid', false, 'error', 'wrong_pin');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'token_id', _row.id,
    'user_id', _row.user_id,
    'email', _row.email,
    'client_id', _row.client_id,
    'company_id', _row.company_id,
    'client_name', _client_name,
    'company_name', _company_name,
    'requires_pin', _row.require_pin
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_consume_token(_token text, _pin text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _validation jsonb;
BEGIN
  _validation := public.portal_validate_token(_token, _pin);
  IF (_validation->>'valid')::boolean IS NOT TRUE THEN
    RETURN _validation;
  END IF;

  UPDATE public.client_portal_access_tokens
  SET last_used_at = now(), pin_attempts = 0, pin_locked_until = NULL
  WHERE id = (_validation->>'token_id')::uuid;

  RETURN _validation;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_validate_token(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_consume_token(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_create_token(uuid, uuid, text, uuid, text, text, integer) TO authenticated;