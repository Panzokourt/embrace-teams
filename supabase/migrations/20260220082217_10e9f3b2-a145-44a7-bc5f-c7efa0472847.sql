
-- ============================================================
-- Media Plans: New header table + FK on media_plan_items
-- ============================================================

-- 1. Create the media_plans table
CREATE TABLE IF NOT EXISTS public.media_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Media Plan',
  status TEXT NOT NULL DEFAULT 'draft',
  total_budget NUMERIC DEFAULT 0,
  agency_fee_percentage NUMERIC DEFAULT 0,
  description TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Add updated_at trigger for media_plans
CREATE TRIGGER update_media_plans_updated_at
  BEFORE UPDATE ON public.media_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Add media_plan_id FK to media_plan_items (nullable for backward compat)
ALTER TABLE public.media_plan_items
  ADD COLUMN IF NOT EXISTS media_plan_id UUID REFERENCES public.media_plans(id) ON DELETE CASCADE;

-- 4. Enable RLS on media_plans
ALTER TABLE public.media_plans ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for media_plans
CREATE POLICY "Admin/Manager can manage media plans"
  ON public.media_plans
  FOR ALL
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can view media plans for their projects"
  ON public.media_plans
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND has_project_access(auth.uid(), project_id)
  );

-- 6. Migrate existing media_plan_items: create default media_plan per project
-- that already has items but no media_plan_id
WITH inserted_plans AS (
  INSERT INTO public.media_plans (project_id, name, status, total_budget, agency_fee_percentage)
  SELECT DISTINCT
    mpi.project_id,
    'Media Plan',
    'active',
    COALESCE(p.budget * (1 - COALESCE(p.agency_fee_percentage, 0) / 100), 0),
    COALESCE(p.agency_fee_percentage, 0)
  FROM public.media_plan_items mpi
  JOIN public.projects p ON p.id = mpi.project_id
  WHERE mpi.media_plan_id IS NULL
  RETURNING id, project_id
)
UPDATE public.media_plan_items mpi
SET media_plan_id = ip.id
FROM inserted_plans ip
WHERE mpi.project_id = ip.project_id
  AND mpi.media_plan_id IS NULL;
