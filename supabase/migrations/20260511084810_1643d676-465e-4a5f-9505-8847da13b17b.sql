
-- ============ MCP OAuth Clients ============
CREATE TABLE public.mcp_oauth_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL UNIQUE,
  client_name text NOT NULL,
  redirect_uris text[] NOT NULL DEFAULT '{}',
  grant_types text[] NOT NULL DEFAULT ARRAY['authorization_code','refresh_token'],
  response_types text[] NOT NULL DEFAULT ARRAY['code'],
  token_endpoint_auth_method text NOT NULL DEFAULT 'none',
  scope text NOT NULL DEFAULT 'tasks:read tasks:write projects:read clients:read time:read time:write kb:read',
  logo_uri text,
  client_uri text,
  registered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mcp_oauth_clients ENABLE ROW LEVEL SECURITY;

-- Anyone can read client metadata (public OAuth metadata) — but no PII inside.
CREATE POLICY "Anyone can read MCP client metadata"
  ON public.mcp_oauth_clients FOR SELECT
  USING (true);

-- ============ Authorization Codes ============
CREATE TABLE public.mcp_oauth_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  client_id text NOT NULL REFERENCES public.mcp_oauth_clients(client_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  redirect_uri text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  code_challenge text NOT NULL,
  code_challenge_method text NOT NULL DEFAULT 'S256',
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mcp_oauth_codes ENABLE ROW LEVEL SECURITY;
-- No client RLS access; only edge functions via service role.

-- ============ Access + Refresh Tokens ============
CREATE TABLE public.mcp_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token_hash text NOT NULL UNIQUE,
  refresh_token_hash text UNIQUE,
  client_id text NOT NULL REFERENCES public.mcp_oauth_clients(client_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  access_token_expires_at timestamptz NOT NULL,
  refresh_token_expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mcp_tokens_user ON public.mcp_oauth_tokens(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_mcp_tokens_access_hash ON public.mcp_oauth_tokens(access_token_hash);

ALTER TABLE public.mcp_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own MCP tokens"
  ON public.mcp_oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users revoke own MCP tokens"
  ON public.mcp_oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own MCP tokens"
  ON public.mcp_oauth_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- ============ Audit Log ============
CREATE TABLE public.mcp_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  client_id text,
  token_id uuid,
  tool_name text NOT NULL,
  args_summary jsonb,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mcp_audit_user_time ON public.mcp_audit_log(user_id, created_at DESC);

ALTER TABLE public.mcp_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own MCP audit"
  ON public.mcp_audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- ============ Helper functions ============
CREATE OR REPLACE FUNCTION public.mcp_hash(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.digest(_input, 'sha256'), 'hex');
$$;

-- Cleanup function for expired codes/tokens
CREATE OR REPLACE FUNCTION public.mcp_cleanup_expired()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.mcp_oauth_codes WHERE expires_at < now() - interval '1 day';
  DELETE FROM public.mcp_oauth_tokens
    WHERE (revoked_at IS NOT NULL AND revoked_at < now() - interval '30 days')
       OR (refresh_token_expires_at IS NOT NULL AND refresh_token_expires_at < now() - interval '7 days');
END;
$$;
