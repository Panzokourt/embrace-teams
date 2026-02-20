
CREATE TABLE public.project_creatives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  
  -- File info (stored in project-files bucket)
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  
  -- Metadata
  title TEXT,
  description TEXT,
  version TEXT DEFAULT '1.0',
  
  -- Linking (optional, can link to one of these)
  deliverable_id UUID REFERENCES public.deliverables(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  media_plan_item_id UUID REFERENCES public.media_plan_items(id) ON DELETE SET NULL,
  
  -- Status & Review
  status TEXT NOT NULL DEFAULT 'draft',
  review_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Upload info
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_creatives ENABLE ROW LEVEL SECURITY;

-- Admin/Manager full access
CREATE POLICY "Admin/Manager can manage creatives" ON public.project_creatives
  FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Users can view creatives for projects they have access to
CREATE POLICY "Users can view creatives for their projects" ON public.project_creatives
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND has_project_access(auth.uid(), project_id)
  );

-- Active users can upload (INSERT) their own creatives
CREATE POLICY "Active users can upload creatives" ON public.project_creatives
  FOR INSERT WITH CHECK (
    is_active_user(auth.uid()) AND auth.uid() = uploaded_by
  );

-- Trigger for updated_at
CREATE TRIGGER update_project_creatives_updated_at
  BEFORE UPDATE ON public.project_creatives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
