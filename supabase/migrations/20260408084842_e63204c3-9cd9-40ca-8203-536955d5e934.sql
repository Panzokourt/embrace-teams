
-- Drop the existing overpermissive policy
DROP POLICY IF EXISTS "Service role can insert brain insights" ON public.brain_insights;

-- Create a new policy restricted to service_role only
CREATE POLICY "Service role can insert brain insights"
ON public.brain_insights FOR INSERT
TO service_role
WITH CHECK (true);
