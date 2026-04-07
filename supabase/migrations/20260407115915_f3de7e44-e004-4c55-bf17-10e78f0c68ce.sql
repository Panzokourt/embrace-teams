
-- 1. Gmail OAuth tokens: add SELECT policy for owner only
CREATE POLICY "Users can read own gmail tokens"
  ON public.gmail_oauth_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Task dependencies: restrict SELECT to project members
DROP POLICY IF EXISTS "Authenticated users can view dependencies" ON public.task_dependencies;
CREATE POLICY "Users can view dependencies for accessible tasks"
  ON public.task_dependencies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
      AND t.project_id IN (SELECT public.get_visible_projects(auth.uid()))
    )
  );
