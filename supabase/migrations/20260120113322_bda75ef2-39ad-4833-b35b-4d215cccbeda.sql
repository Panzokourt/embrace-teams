-- Create comments table for tasks and projects
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES public.deliverables(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT comment_target_check CHECK (
    (project_id IS NOT NULL AND task_id IS NULL AND deliverable_id IS NULL) OR
    (project_id IS NULL AND task_id IS NOT NULL AND deliverable_id IS NULL) OR
    (project_id IS NULL AND task_id IS NULL AND deliverable_id IS NOT NULL)
  )
);

-- Create activity log table
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_name TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create file attachments table
CREATE TABLE public.file_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES public.deliverables(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Admin/Manager can manage all comments"
ON public.comments FOR ALL
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can view comments on their projects"
ON public.comments FOR SELECT
USING (
  (project_id IS NOT NULL AND has_project_access(auth.uid(), project_id)) OR
  (task_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = comments.task_id AND has_project_access(auth.uid(), t.project_id)
  )) OR
  (deliverable_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM deliverables d WHERE d.id = comments.deliverable_id AND has_project_access(auth.uid(), d.project_id)
  ))
);

CREATE POLICY "Active users can create comments"
ON public.comments FOR INSERT
WITH CHECK (is_active_user(auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.comments FOR DELETE
USING (auth.uid() = user_id);

-- Activity log policies
CREATE POLICY "Admin/Manager can view all activity"
ON public.activity_log FOR SELECT
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can view their own activity"
ON public.activity_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Active users can create activity logs"
ON public.activity_log FOR INSERT
WITH CHECK (is_active_user(auth.uid()));

-- File attachments policies
CREATE POLICY "Admin/Manager can manage all files"
ON public.file_attachments FOR ALL
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can view files on their projects"
ON public.file_attachments FOR SELECT
USING (
  (project_id IS NOT NULL AND has_project_access(auth.uid(), project_id)) OR
  (task_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = file_attachments.task_id AND has_project_access(auth.uid(), t.project_id)
  )) OR
  (deliverable_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM deliverables d WHERE d.id = file_attachments.deliverable_id AND has_project_access(auth.uid(), d.project_id)
  ))
);

CREATE POLICY "Active users can upload files"
ON public.file_attachments FOR INSERT
WITH CHECK (is_active_user(auth.uid()) AND auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own files"
ON public.file_attachments FOR DELETE
USING (auth.uid() = uploaded_by);

-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project files
CREATE POLICY "Authenticated users can upload project files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view project files"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own project files"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create trigger for comments updated_at
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;