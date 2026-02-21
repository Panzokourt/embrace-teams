
-- 1. Trigger: auto-create project channel on project insert
-- Uses first company owner as channel creator since projects don't have created_by
CREATE OR REPLACE FUNCTION public.auto_create_project_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _channel_id UUID;
  _owner_id UUID;
BEGIN
  -- Find company owner
  SELECT user_id INTO _owner_id FROM public.user_company_roles 
  WHERE company_id = NEW.company_id AND role = 'owner' LIMIT 1;
  
  IF _owner_id IS NULL THEN
    SELECT user_id INTO _owner_id FROM public.user_company_roles 
    WHERE company_id = NEW.company_id LIMIT 1;
  END IF;
  
  IF _owner_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.chat_channels (company_id, project_id, name, type, created_by, description)
  VALUES (NEW.company_id, NEW.id, NEW.name, 'public', _owner_id, 'Κανάλι έργου: ' || NEW.name)
  RETURNING id INTO _channel_id;

  INSERT INTO public.chat_channel_members (channel_id, user_id, role)
  VALUES (_channel_id, _owner_id, 'owner')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_project_channel ON public.projects;
CREATE TRIGGER trg_auto_create_project_channel
AFTER INSERT ON public.projects
FOR EACH ROW
WHEN (NEW.company_id IS NOT NULL)
EXECUTE FUNCTION public.auto_create_project_channel();

-- 2. Trigger: sync project team members to chat channel
CREATE OR REPLACE FUNCTION public.sync_project_team_to_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _channel_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT id INTO _channel_id FROM public.chat_channels WHERE project_id = NEW.project_id LIMIT 1;
    IF _channel_id IS NOT NULL THEN
      INSERT INTO public.chat_channel_members (channel_id, user_id, role)
      VALUES (_channel_id, NEW.user_id, 'member')
      ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT id INTO _channel_id FROM public.chat_channels WHERE project_id = OLD.project_id LIMIT 1;
    IF _channel_id IS NOT NULL THEN
      DELETE FROM public.chat_channel_members WHERE channel_id = _channel_id AND user_id = OLD.user_id AND role = 'member';
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_project_team_to_chat ON public.project_user_access;
CREATE TRIGGER trg_sync_project_team_to_chat
AFTER INSERT OR DELETE ON public.project_user_access
FOR EACH ROW
EXECUTE FUNCTION public.sync_project_team_to_chat();

-- 3. Unique constraint on chat_channel_members
ALTER TABLE public.chat_channel_members DROP CONSTRAINT IF EXISTS chat_channel_members_channel_user_unique;
ALTER TABLE public.chat_channel_members ADD CONSTRAINT chat_channel_members_channel_user_unique UNIQUE (channel_id, user_id);

-- 4. Backfill: create channels for existing projects
INSERT INTO public.chat_channels (company_id, project_id, name, type, created_by, description)
SELECT p.company_id, p.id, p.name, 'public',
  (SELECT ucr.user_id FROM public.user_company_roles ucr WHERE ucr.company_id = p.company_id AND ucr.role = 'owner' LIMIT 1),
  'Κανάλι έργου: ' || p.name
FROM public.projects p
WHERE p.company_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.chat_channels cc WHERE cc.project_id = p.id);

-- 5. Backfill: add existing project team members to channels
INSERT INTO public.chat_channel_members (channel_id, user_id, role)
SELECT cc.id, pua.user_id, 'member'
FROM public.chat_channels cc
JOIN public.project_user_access pua ON pua.project_id = cc.project_id
WHERE cc.project_id IS NOT NULL
ON CONFLICT (channel_id, user_id) DO NOTHING;

-- 6. Create channels for clients
INSERT INTO public.chat_channels (company_id, name, type, created_by, description)
SELECT c.company_id, c.name, 'public',
  (SELECT ucr.user_id FROM public.user_company_roles ucr WHERE ucr.company_id = c.company_id AND ucr.role = 'owner' LIMIT 1),
  'Κανάλι πελάτη: ' || c.name
FROM public.clients c
WHERE c.company_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.chat_channels cc WHERE cc.name = c.name AND cc.company_id = c.company_id AND cc.type = 'public' AND cc.project_id IS NULL
);

-- 7. Full-text search index
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_search ON public.chat_messages USING GIN (to_tsvector('simple', content));

-- 8. Search function
CREATE OR REPLACE FUNCTION public.search_chat_messages(_query text, _company_id uuid, _limit int DEFAULT 50)
RETURNS TABLE(
  id uuid,
  channel_id uuid,
  user_id uuid,
  content text,
  created_at timestamptz,
  channel_name text,
  sender_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT m.id, m.channel_id, m.user_id, m.content, m.created_at,
    ch.name AS channel_name,
    p.full_name AS sender_name
  FROM public.chat_messages m
  JOIN public.chat_channels ch ON ch.id = m.channel_id
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE ch.company_id = _company_id
    AND m.deleted_at IS NULL
    AND to_tsvector('simple', m.content) @@ plainto_tsquery('simple', _query)
  ORDER BY m.created_at DESC
  LIMIT _limit;
$$;
