-- Create file_folders table for hierarchical folder structure
CREATE TABLE public.file_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tender_id UUID REFERENCES public.tenders(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES public.file_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure folder belongs to either tender or project
  CONSTRAINT folder_entity_check CHECK (
    (tender_id IS NOT NULL AND project_id IS NULL) OR
    (tender_id IS NULL AND project_id IS NOT NULL)
  )
);

-- Add folder_id to file_attachments
ALTER TABLE public.file_attachments 
ADD COLUMN folder_id UUID REFERENCES public.file_folders(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_file_folders_tender_id ON public.file_folders(tender_id);
CREATE INDEX idx_file_folders_project_id ON public.file_folders(project_id);
CREATE INDEX idx_file_folders_parent_id ON public.file_folders(parent_folder_id);
CREATE INDEX idx_file_attachments_folder_id ON public.file_attachments(folder_id);

-- Enable RLS
ALTER TABLE public.file_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_folders
CREATE POLICY "Admin/Manager can manage folders"
ON public.file_folders
FOR ALL
USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can view tender folders"
ON public.file_folders
FOR SELECT
USING (
  (tender_id IS NOT NULL AND (
    is_admin_or_manager(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM tender_team_access
      WHERE tender_team_access.tender_id = file_folders.tender_id
      AND tender_team_access.user_id = auth.uid()
    )
  ))
);

CREATE POLICY "Users can view project folders"
ON public.file_folders
FOR SELECT
USING (
  (project_id IS NOT NULL AND has_project_access(auth.uid(), project_id))
);

-- Trigger for updated_at
CREATE TRIGGER update_file_folders_updated_at
  BEFORE UPDATE ON public.file_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();