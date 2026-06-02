DROP POLICY IF EXISTS "Authenticated users can view task assignees" ON public.task_assignees;
CREATE POLICY "Users can view task assignees for accessible tasks"
  ON public.task_assignees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignees.task_id
      AND public.has_project_access(auth.uid(), t.project_id)
    )
  );