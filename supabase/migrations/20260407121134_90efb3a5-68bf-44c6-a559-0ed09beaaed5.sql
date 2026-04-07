
CREATE TABLE public.task_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
  review_type TEXT NOT NULL DEFAULT 'internal',
  status TEXT NOT NULL DEFAULT 'pending',
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.task_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reviews for accessible tasks"
  ON public.task_reviews FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t 
    WHERE t.id = task_id 
    AND t.project_id IN (SELECT public.get_visible_projects(auth.uid()))
  ));

CREATE POLICY "Authenticated can create reviews"
  ON public.task_reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Reviewer can update own reviews"
  ON public.task_reviews FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid());
