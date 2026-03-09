
CREATE TABLE public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, depends_on_task_id)
);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dependencies"
  ON public.task_dependencies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert dependencies"
  ON public.task_dependencies FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete dependencies"
  ON public.task_dependencies FOR DELETE TO authenticated USING (true);
