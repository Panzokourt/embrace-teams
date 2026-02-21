
-- Secretary conversation history tables
CREATE TABLE public.secretary_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Νέα συνομιλία',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.secretary_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.secretary_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.secretary_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretary_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
  ON public.secretary_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON public.secretary_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.secretary_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.secretary_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Messages: access via conversation ownership
CREATE POLICY "Users can view messages of own conversations"
  ON public.secretary_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.secretary_conversations sc 
    WHERE sc.id = conversation_id AND sc.user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages in own conversations"
  ON public.secretary_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.secretary_conversations sc 
    WHERE sc.id = conversation_id AND sc.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete messages of own conversations"
  ON public.secretary_messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.secretary_conversations sc 
    WHERE sc.id = conversation_id AND sc.user_id = auth.uid()
  ));

-- Index for fast lookups
CREATE INDEX idx_secretary_conversations_user ON public.secretary_conversations(user_id, updated_at DESC);
CREATE INDEX idx_secretary_messages_conversation ON public.secretary_messages(conversation_id, created_at);
