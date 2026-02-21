
-- Email accounts table
CREATE TABLE public.email_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  email_address text NOT NULL,
  display_name text,
  imap_host text NOT NULL,
  imap_port integer NOT NULL DEFAULT 993,
  smtp_host text NOT NULL,
  smtp_port integer NOT NULL DEFAULT 587,
  username text NOT NULL,
  encrypted_password text NOT NULL,
  use_tls boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own email accounts"
  ON public.email_accounts FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Email messages table
CREATE TABLE public.email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.email_accounts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message_uid text,
  message_id_header text,
  thread_id text,
  subject text,
  from_address text,
  from_name text,
  to_addresses jsonb DEFAULT '[]'::jsonb,
  cc_addresses jsonb DEFAULT '[]'::jsonb,
  body_text text,
  body_html text,
  is_read boolean NOT NULL DEFAULT false,
  is_starred boolean NOT NULL DEFAULT false,
  folder text NOT NULL DEFAULT 'INBOX',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, message_uid)
);

ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own email messages"
  ON public.email_messages FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_email_messages_thread ON public.email_messages(thread_id);
CREATE INDEX idx_email_messages_account_folder ON public.email_messages(account_id, folder);
CREATE INDEX idx_email_messages_sent_at ON public.email_messages(sent_at DESC);
CREATE INDEX idx_email_accounts_user ON public.email_accounts(user_id);

-- Updated_at trigger for email_accounts
CREATE TRIGGER update_email_accounts_updated_at
  BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
