-- Extend profiles table with additional user info
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reports_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hire_date DATE;

-- Change default status from 'pending' to 'active' for new users
ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'active'::user_status;
ALTER TABLE public.user_company_roles ALTER COLUMN status SET DEFAULT 'active'::user_status;

-- Create org_chart_positions table for the organization chart
CREATE TABLE IF NOT EXISTS public.org_chart_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_position_id UUID REFERENCES public.org_chart_positions(id) ON DELETE SET NULL,
  position_title TEXT NOT NULL,
  department TEXT,
  level INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on org_chart_positions
ALTER TABLE public.org_chart_positions ENABLE ROW LEVEL SECURITY;

-- RLS policies for org_chart_positions
CREATE POLICY "Users can view org chart in their company"
ON public.org_chart_positions
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admin/Manager can manage org chart"
ON public.org_chart_positions
FOR ALL
USING (is_admin_or_manager(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Index for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_org_chart_parent ON public.org_chart_positions(parent_position_id);
CREATE INDEX IF NOT EXISTS idx_org_chart_company ON public.org_chart_positions(company_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_org_chart_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_org_chart_positions_updated_at
  BEFORE UPDATE ON public.org_chart_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_org_chart_updated_at();

-- Enable realtime for org_chart_positions
ALTER PUBLICATION supabase_realtime ADD TABLE public.org_chart_positions;