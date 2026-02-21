
-- ============================================
-- OLSENY CHAT: Database Schema Migration
-- ============================================

-- 1. Chat Channels
CREATE TABLE public.chat_channels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private', 'direct', 'group')),
  created_by uuid NOT NULL,
  is_archived boolean NOT NULL DEFAULT false,
  avatar_url text,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Chat Channel Members
CREATE TABLE public.chat_channel_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  muted boolean NOT NULL DEFAULT false,
  last_read_at timestamptz DEFAULT now(),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- 3. Chat Messages
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_message_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  content text NOT NULL DEFAULT '',
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system', 'action')),
  metadata jsonb DEFAULT '{}'::jsonb,
  is_pinned boolean NOT NULL DEFAULT false,
  is_edited boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Chat Message Reactions
CREATE TABLE public.chat_message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- 5. Chat Message Attachments
CREATE TABLE public.chat_message_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  content_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Chat Message Tags
CREATE TABLE public.chat_message_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_chat_channels_company ON public.chat_channels(company_id);
CREATE INDEX idx_chat_channels_project ON public.chat_channels(project_id);
CREATE INDEX idx_chat_channel_members_channel ON public.chat_channel_members(channel_id);
CREATE INDEX idx_chat_channel_members_user ON public.chat_channel_members(user_id);
CREATE INDEX idx_chat_messages_channel ON public.chat_messages(channel_id);
CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_parent ON public.chat_messages(parent_message_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(channel_id, created_at DESC);
CREATE INDEX idx_chat_message_reactions_message ON public.chat_message_reactions(message_id);
CREATE INDEX idx_chat_message_attachments_message ON public.chat_message_attachments(message_id);
CREATE INDEX idx_chat_message_tags_message ON public.chat_message_tags(message_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER update_chat_channels_updated_at
  BEFORE UPDATE ON public.chat_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_tags ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is member of a channel
CREATE OR REPLACE FUNCTION public.is_chat_channel_member(_user_id uuid, _channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_channel_members
    WHERE user_id = _user_id AND channel_id = _channel_id
  )
$$;

-- Helper function: check if user is admin/owner of a channel
CREATE OR REPLACE FUNCTION public.is_chat_channel_admin(_user_id uuid, _channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_channel_members
    WHERE user_id = _user_id AND channel_id = _channel_id AND role IN ('owner', 'admin')
  )
$$;

-- CHAT CHANNELS policies
CREATE POLICY "Users can view public channels in their company"
  ON public.chat_channels FOR SELECT
  USING (
    type = 'public' AND company_id = get_user_company_id(auth.uid())
  );

CREATE POLICY "Members can view their channels"
  ON public.chat_channels FOR SELECT
  USING (
    is_chat_channel_member(auth.uid(), id)
  );

CREATE POLICY "Active users can create channels"
  ON public.chat_channels FOR INSERT
  WITH CHECK (
    is_active_user(auth.uid()) AND auth.uid() = created_by AND company_id = get_user_company_id(auth.uid())
  );

CREATE POLICY "Channel admins can update channels"
  ON public.chat_channels FOR UPDATE
  USING (
    is_chat_channel_admin(auth.uid(), id)
  );

CREATE POLICY "Company admins can manage channels"
  ON public.chat_channels FOR ALL
  USING (
    is_admin_or_manager(auth.uid()) AND company_id = get_user_company_id(auth.uid())
  );

-- CHAT CHANNEL MEMBERS policies
CREATE POLICY "Members can view channel members"
  ON public.chat_channel_members FOR SELECT
  USING (
    is_chat_channel_member(auth.uid(), channel_id)
  );

CREATE POLICY "Channel admins can manage members"
  ON public.chat_channel_members FOR ALL
  USING (
    is_chat_channel_admin(auth.uid(), channel_id)
  );

CREATE POLICY "Users can join public channels"
  ON public.chat_channel_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.chat_channels
      WHERE id = channel_id AND type = 'public' AND company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Users can update own membership"
  ON public.chat_channel_members FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Company admins can manage all members"
  ON public.chat_channel_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.id = channel_id AND is_admin_or_manager(auth.uid()) AND c.company_id = get_user_company_id(auth.uid())
    )
  );

-- CHAT MESSAGES policies
CREATE POLICY "Members can view channel messages"
  ON public.chat_messages FOR SELECT
  USING (
    is_chat_channel_member(auth.uid(), channel_id) AND deleted_at IS NULL
  );

CREATE POLICY "Members can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND is_chat_channel_member(auth.uid(), channel_id)
  );

CREATE POLICY "Users can update own messages"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Channel admins can update any message"
  ON public.chat_messages FOR UPDATE
  USING (is_chat_channel_admin(auth.uid(), channel_id));

CREATE POLICY "Users can delete own messages"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- CHAT MESSAGE REACTIONS policies
CREATE POLICY "Members can view reactions"
  ON public.chat_message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = message_id AND is_chat_channel_member(auth.uid(), m.channel_id)
    )
  );

CREATE POLICY "Members can add reactions"
  ON public.chat_message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = message_id AND is_chat_channel_member(auth.uid(), m.channel_id)
    )
  );

CREATE POLICY "Users can remove own reactions"
  ON public.chat_message_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- CHAT MESSAGE ATTACHMENTS policies
CREATE POLICY "Members can view attachments"
  ON public.chat_message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = message_id AND is_chat_channel_member(auth.uid(), m.channel_id)
    )
  );

CREATE POLICY "Members can add attachments"
  ON public.chat_message_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = message_id AND m.user_id = auth.uid()
    )
  );

-- CHAT MESSAGE TAGS policies
CREATE POLICY "Members can view tags"
  ON public.chat_message_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = message_id AND is_chat_channel_member(auth.uid(), m.channel_id)
    )
  );

CREATE POLICY "Members can add tags"
  ON public.chat_message_tags FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = message_id AND is_chat_channel_member(auth.uid(), m.channel_id)
    )
  );

CREATE POLICY "Tag creators can remove tags"
  ON public.chat_message_tags FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channel_members;

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', false);

-- Storage policies for chat-attachments
CREATE POLICY "Chat members can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Chat members can view attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete own chat attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text
  );
