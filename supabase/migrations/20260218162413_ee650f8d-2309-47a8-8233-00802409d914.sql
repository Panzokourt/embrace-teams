
-- Create services table
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'project',
  list_price numeric NOT NULL DEFAULT 0,
  pricing_unit text NOT NULL DEFAULT 'project',
  internal_cost numeric DEFAULT 0,
  target_margin numeric DEFAULT 0,
  role_hours jsonb DEFAULT '{}',
  role_rates jsonb DEFAULT '{}',
  template_id uuid REFERENCES public.project_templates(id),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view services"
  ON public.services FOR SELECT
  USING (is_active_user(auth.uid()));

CREATE POLICY "Admin/Manager can manage services"
  ON public.services FOR ALL
  USING (is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Alter invoices: add new columns
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id),
  ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 24,
  ADD COLUMN IF NOT EXISTS net_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS file_path text;

-- Alter expenses: add new columns + make project_id nullable
ALTER TABLE public.expenses
  ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id),
  ADD COLUMN IF NOT EXISTS vendor_name text,
  ADD COLUMN IF NOT EXISTS expense_type text NOT NULL DEFAULT 'vendor',
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Drop the existing NOT NULL FK constraint on expenses.project_id if needed
ALTER TABLE public.expenses
  ALTER COLUMN project_id SET DEFAULT NULL;
