
-- Email attachments table
CREATE TABLE public.email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.email_messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  filename text NOT NULL,
  mime_type text,
  size_bytes integer,
  gmail_attachment_id text,
  storage_path text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own email attachments"
  ON public.email_attachments FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Email entity links table
CREATE TABLE public.email_entity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id uuid REFERENCES public.email_messages(id) ON DELETE CASCADE,
  thread_id text,
  entity_type text NOT NULL CHECK (entity_type IN ('client', 'project', 'task')),
  entity_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(thread_id, entity_type, entity_id)
);

ALTER TABLE public.email_entity_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own email entity links"
  ON public.email_entity_links FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create storage bucket for email attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload email attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'email-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can read own email attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'email-attachments' AND auth.uid() IS NOT NULL);
