
-- Fix SECURITY DEFINER views - set to SECURITY INVOKER
ALTER VIEW public.gmail_accounts_safe SET (security_invoker = on);
ALTER VIEW public.email_accounts_safe SET (security_invoker = on);

-- Add RLS-like filtering via the view by redefining with WHERE clause
CREATE OR REPLACE VIEW public.gmail_accounts_safe 
WITH (security_invoker = on) AS
SELECT id, user_id, company_id, email_address, display_name, is_active, last_sync_at, created_at, updated_at, scopes
FROM public.gmail_oauth_tokens
WHERE user_id = auth.uid();

CREATE OR REPLACE VIEW public.email_accounts_safe 
WITH (security_invoker = on) AS
SELECT id, user_id, company_id, email_address, display_name, imap_host, imap_port, smtp_host, smtp_port, use_tls, is_active, last_sync_at, created_at, updated_at, username
FROM public.email_accounts
WHERE user_id = auth.uid();
