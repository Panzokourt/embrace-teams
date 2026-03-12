
-- 1. Alter media_plans: add standalone fields
ALTER TABLE public.media_plans ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);
ALTER TABLE public.media_plans ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE public.media_plans ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE public.media_plans ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.media_plans ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE public.media_plans ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
ALTER TABLE public.media_plans ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.media_plans ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 2. Alter media_plan_items: add missing fields
ALTER TABLE public.media_plan_items ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.media_plan_items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.media_plan_items ADD COLUMN IF NOT EXISTS subchannel TEXT;
ALTER TABLE public.media_plan_items ADD COLUMN IF NOT EXISTS funnel_stage TEXT;
ALTER TABLE public.media_plan_items ADD COLUMN IF NOT EXISTS audience TEXT;
ALTER TABLE public.media_plan_items ADD COLUMN IF NOT EXISTS geography TEXT;
ALTER TABLE public.media_plan_items ADD COLUMN IF NOT EXISTS message_summary TEXT;
ALTER TABLE public.media_plan_items ADD COLUMN IF NOT EXISTS daily_budget NUMERIC;
ALTER TABLE public.media_plan_items ADD COLUMN IF NOT EXISTS kpi_target TEXT;
ALTER TABLE public.media_plan_items ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.media_plan_items ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.media_plan_items ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE public.media_plan_items ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.media_plan_items ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.media_plan_items ADD COLUMN IF NOT EXISTS cost_type TEXT;
ALTER TABLE public.media_plan_items ADD COLUMN IF NOT EXISTS approval_needed BOOLEAN DEFAULT false;
ALTER TABLE public.media_plan_items ADD COLUMN IF NOT EXISTS dependency_id UUID REFERENCES public.media_plan_items(id);

-- 3. Junction table for multi-task linking
CREATE TABLE IF NOT EXISTS public.media_plan_item_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_plan_item_id UUID REFERENCES public.media_plan_items(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(media_plan_item_id, task_id)
);

ALTER TABLE public.media_plan_item_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view media plan item tasks via project access"
  ON public.media_plan_item_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_plan_items mpi
      WHERE mpi.id = media_plan_item_tasks.media_plan_item_id
      AND has_project_access(auth.uid(), mpi.project_id)
    )
  );

CREATE POLICY "Admin/Manager can manage media plan item tasks"
  ON public.media_plan_item_tasks FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_plan_items mpi
      JOIN public.projects p ON p.id = mpi.project_id
      WHERE mpi.id = media_plan_item_tasks.media_plan_item_id
      AND is_company_admin_or_manager(auth.uid(), p.company_id)
    )
  );

-- 4. Channel taxonomy table
CREATE TABLE IF NOT EXISTS public.media_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  group_name TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0
);

ALTER TABLE public.media_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view default channels"
  ON public.media_channels FOR SELECT TO authenticated
  USING (is_default = true OR company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid()));

CREATE POLICY "Admin can manage company channels"
  ON public.media_channels FOR ALL TO authenticated
  USING (is_company_admin(auth.uid(), company_id));

-- 5. Update RLS on media_plans to support company_id-based access too
CREATE POLICY "Users can view media plans by company"
  ON public.media_plans FOR SELECT TO authenticated
  USING (
    company_id IS NOT NULL AND company_id IN (
      SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/Manager can manage media plans by company"
  ON public.media_plans FOR ALL TO authenticated
  USING (
    company_id IS NOT NULL AND is_company_admin_or_manager(auth.uid(), company_id)
  );
