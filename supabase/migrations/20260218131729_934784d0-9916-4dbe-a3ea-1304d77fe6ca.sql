
-- Create briefs table
CREATE TABLE public.briefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  project_id UUID REFERENCES public.projects(id),
  client_id UUID REFERENCES public.clients(id),
  created_by UUID NOT NULL,
  brief_type TEXT NOT NULL,
  title TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

-- Admin/Manager full access
CREATE POLICY "Admin/Manager can manage briefs"
ON public.briefs FOR ALL
USING (is_admin_or_manager(auth.uid()));

-- Active users can create their own briefs
CREATE POLICY "Active users can create briefs"
ON public.briefs FOR INSERT
WITH CHECK (is_active_user(auth.uid()) AND auth.uid() = created_by);

-- Users can view their own briefs
CREATE POLICY "Users can view their own briefs"
ON public.briefs FOR SELECT
USING (auth.uid() = created_by);

-- Users can update their own briefs
CREATE POLICY "Users can update own briefs"
ON public.briefs FOR UPDATE
USING (auth.uid() = created_by);

-- Users can delete their own briefs
CREATE POLICY "Users can delete own briefs"
ON public.briefs FOR DELETE
USING (auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_briefs_updated_at
BEFORE UPDATE ON public.briefs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
