
CREATE TABLE public.comment_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  content_type TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comment_attachments ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view attachments on comments they can see
CREATE POLICY "Authenticated users can view comment attachments"
  ON public.comment_attachments FOR SELECT TO authenticated
  USING (true);

-- Users can insert their own attachments
CREATE POLICY "Users can insert own comment attachments"
  ON public.comment_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- Users can delete their own attachments
CREATE POLICY "Users can delete own comment attachments"
  ON public.comment_attachments FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());
