
-- Fix 1: Restrict gmail_oauth_tokens SELECT to non-sensitive columns via a view
-- Drop the current permissive SELECT policy
DROP POLICY IF EXISTS "Users can view own gmail tokens" ON public.gmail_oauth_tokens;

-- Create a safe view that excludes sensitive token columns
CREATE OR REPLACE VIEW public.gmail_accounts_safe AS
SELECT id, user_id, company_id, email_address, display_name, is_active, last_sync_at, created_at, updated_at, scopes
FROM public.gmail_oauth_tokens;

-- Grant select on the safe view to authenticated users
GRANT SELECT ON public.gmail_accounts_safe TO authenticated;

-- No direct SELECT on gmail_oauth_tokens for regular users anymore.
-- Edge functions use SERVICE_ROLE_KEY which bypasses RLS.
-- Keep INSERT/UPDATE/DELETE policies for disconnect functionality.

-- Also restrict email_accounts: create a safe view excluding encrypted_password
CREATE OR REPLACE VIEW public.email_accounts_safe AS
SELECT id, user_id, company_id, email_address, display_name, imap_host, imap_port, smtp_host, smtp_port, use_tls, is_active, last_sync_at, created_at, updated_at, username
FROM public.email_accounts;

GRANT SELECT ON public.email_accounts_safe TO authenticated;

-- Drop the overly permissive ALL policy and replace with non-SELECT policies
DROP POLICY IF EXISTS "Users can manage their own email accounts" ON public.email_accounts;

CREATE POLICY "Users can insert own email accounts" ON public.email_accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own email accounts" ON public.email_accounts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own email accounts" ON public.email_accounts
  FOR DELETE USING (user_id = auth.uid());

-- Fix 2: Restrict email-attachments storage bucket policy
DROP POLICY IF EXISTS "Users can read own email attachments" ON storage.objects;

CREATE POLICY "Users can read own email attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'email-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
