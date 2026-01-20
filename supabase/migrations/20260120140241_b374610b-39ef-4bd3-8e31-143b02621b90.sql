-- Create media_plan_items table for storing media plan entries
CREATE TABLE public.media_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES public.deliverables(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  
  -- Basic fields
  medium TEXT NOT NULL, -- Facebook, Google Ads, TV, Radio, Print, etc.
  placement TEXT, -- e.g. "Feed", "Stories", "Banner 300x250"
  campaign_name TEXT,
  
  -- Dates
  start_date DATE,
  end_date DATE,
  
  -- Budget
  budget NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  
  -- Marketing metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC GENERATED ALWAYS AS (CASE WHEN impressions > 0 THEN (clicks::NUMERIC / impressions::NUMERIC) * 100 ELSE 0 END) STORED,
  cpm NUMERIC GENERATED ALWAYS AS (CASE WHEN impressions > 0 THEN (actual_cost / impressions::NUMERIC) * 1000 ELSE 0 END) STORED,
  cpc NUMERIC GENERATED ALWAYS AS (CASE WHEN clicks > 0 THEN actual_cost / clicks::NUMERIC ELSE 0 END) STORED,
  
  -- Target audience
  target_audience TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Status
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_plan_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin/Manager can manage media plan items"
  ON public.media_plan_items
  FOR ALL
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can view media plan items for their projects"
  ON public.media_plan_items
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

-- Create trigger for updated_at
CREATE TRIGGER update_media_plan_items_updated_at
  BEFORE UPDATE ON public.media_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.media_plan_items;