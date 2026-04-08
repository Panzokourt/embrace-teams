
CREATE TABLE public.secretary_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL DEFAULT 'general',
  key text NOT NULL,
  content text NOT NULL,
  source_conversation_id uuid REFERENCES public.secretary_conversations(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.secretary_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own memory"
  ON public.secretary_memory FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_secretary_memory_user ON public.secretary_memory(user_id);
CREATE INDEX idx_secretary_memory_category ON public.secretary_memory(user_id, category);
CREATE INDEX idx_secretary_memory_search ON public.secretary_memory USING gin(to_tsvector('simple', content));
