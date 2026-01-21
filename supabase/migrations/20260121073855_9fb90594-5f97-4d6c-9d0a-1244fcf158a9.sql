-- Fix the invitations policy that tries to access auth.users
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.invitations;

CREATE POLICY "Users can view their own invitations"
ON public.invitations
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);