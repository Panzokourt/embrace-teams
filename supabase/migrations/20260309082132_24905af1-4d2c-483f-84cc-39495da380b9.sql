
DROP POLICY "Authenticated users can insert dependencies" ON public.task_dependencies;
DROP POLICY "Authenticated users can delete dependencies" ON public.task_dependencies;

CREATE POLICY "Admin or manager can insert dependencies"
  ON public.task_dependencies FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin or manager can delete dependencies"
  ON public.task_dependencies FOR DELETE TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));
