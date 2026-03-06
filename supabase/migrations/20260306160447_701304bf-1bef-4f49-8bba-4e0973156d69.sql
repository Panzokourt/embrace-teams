
CREATE TABLE public.task_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view task assignees"
  ON public.task_assignees FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin or manager can manage task assignees"
  ON public.task_assignees FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can manage their own task assignments"
  ON public.task_assignees FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid()));
