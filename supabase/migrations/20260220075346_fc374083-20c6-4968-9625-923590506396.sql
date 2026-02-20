ALTER TABLE public.media_plan_items 
  ADD COLUMN IF NOT EXISTS objective TEXT DEFAULT 'awareness',
  ADD COLUMN IF NOT EXISTS phase TEXT,
  ADD COLUMN IF NOT EXISTS format TEXT,
  ADD COLUMN IF NOT EXISTS frequency NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reach INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- net_budget as a regular column (computed on insert/update via trigger since GENERATED ALWAYS doesn't work easily with nullable budget)
ALTER TABLE public.media_plan_items 
  ADD COLUMN IF NOT EXISTS net_budget NUMERIC DEFAULT 0;

-- Function to compute net_budget
CREATE OR REPLACE FUNCTION public.compute_net_budget()
RETURNS TRIGGER AS $$
BEGIN
  NEW.net_budget := COALESCE(NEW.budget, 0) * (1 - COALESCE(NEW.commission_rate, 0) / 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-compute net_budget on insert/update
DROP TRIGGER IF EXISTS trg_compute_net_budget ON public.media_plan_items;
CREATE TRIGGER trg_compute_net_budget
  BEFORE INSERT OR UPDATE ON public.media_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.compute_net_budget();