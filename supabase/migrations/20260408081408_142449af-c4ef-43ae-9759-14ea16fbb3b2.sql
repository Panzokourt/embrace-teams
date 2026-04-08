ALTER TABLE public.secretary_memory 
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_secretary_memory_project ON public.secretary_memory(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_secretary_memory_client ON public.secretary_memory(client_id) WHERE client_id IS NOT NULL;