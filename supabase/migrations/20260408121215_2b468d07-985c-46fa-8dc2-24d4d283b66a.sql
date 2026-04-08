
-- Fix 1: brain_insights INSERT policy - restrict to service_role only
DROP POLICY IF EXISTS "Service role can insert brain insights" ON public.brain_insights;
CREATE POLICY "Service role can insert brain insights"
  ON public.brain_insights FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Fix 2: chat-attachments SELECT policy - restrict to channel members
DROP POLICY IF EXISTS "Chat members can view attachments" ON storage.objects;
CREATE POLICY "Chat members can view attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-attachments'
    AND EXISTS (
      SELECT 1 FROM public.chat_message_attachments cma
      JOIN public.chat_messages m ON m.id = cma.message_id
      WHERE cma.file_path = name
      AND public.is_chat_channel_member(auth.uid(), m.channel_id)
    )
  );

-- Fix 3: chat-attachments INSERT policy - restrict to channel members
DROP POLICY IF EXISTS "Chat members can upload attachments" ON storage.objects;
CREATE POLICY "Chat members can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
  );
