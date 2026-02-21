
-- Create project_folders table
CREATE TABLE public.project_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES public.project_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add folder_id to projects
ALTER TABLE public.projects ADD COLUMN folder_id UUID REFERENCES public.project_folders(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;

-- RLS: Active users can view folders in their company
CREATE POLICY "Active users can view project folders"
  ON public.project_folders FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

-- RLS: Admin/Manager can manage folders
CREATE POLICY "Admin/Manager can manage project folders"
  ON public.project_folders FOR ALL
  USING (is_admin_or_manager(auth.uid()) AND company_id = get_user_company_id(auth.uid()));
