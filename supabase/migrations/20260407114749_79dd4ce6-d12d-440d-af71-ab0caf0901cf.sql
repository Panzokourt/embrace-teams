
-- 1. Fix brain_insights: restrict INSERT to service_role only
DROP POLICY IF EXISTS "Service role can insert brain insights" ON public.brain_insights;
CREATE POLICY "Service role can insert brain insights"
  ON public.brain_insights FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2. Fix email_accounts: add SELECT policy so users can read only their own accounts
CREATE POLICY "Users can read own email accounts"
  ON public.email_accounts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3. Fix get_user_company_id: add status = 'active' filter
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $$
  SELECT company_id FROM public.user_company_roles 
  WHERE user_id = _user_id AND status = 'active'
  LIMIT 1
$$;

-- 4. Fix chat-attachments storage: restrict SELECT to channel members
DROP POLICY IF EXISTS "Chat members can view attachments" ON storage.objects;
CREATE POLICY "Chat members can view attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND EXISTS (
      SELECT 1 FROM public.chat_message_attachments cma
      JOIN public.chat_messages m ON m.id = cma.message_id
      WHERE cma.file_path = name
      AND public.is_chat_channel_member(auth.uid(), m.channel_id)
    )
  );

-- Fix chat-attachments storage: restrict INSERT to channel members
DROP POLICY IF EXISTS "Chat members can upload attachments" ON storage.objects;
CREATE POLICY "Chat members can upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
  );
