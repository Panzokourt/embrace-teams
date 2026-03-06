
-- Phase 1: Pricing Module Schema

-- 1. Alter existing services table with new columns
ALTER TABLE public.services 
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id),
  ADD COLUMN IF NOT EXISTS pricing_model text DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS deliverables text[],
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS estimated_turnaround text,
  ADD COLUMN IF NOT EXISTS external_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- 2. Service role costs (replaces JSON role_hours/role_rates)
CREATE TABLE public.service_role_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id),
  role_title text NOT NULL,
  level text,
  department_id uuid REFERENCES departments(id),
  estimated_hours numeric NOT NULL DEFAULT 0,
  hourly_cost numeric NOT NULL DEFAULT 0,
  cost_source text DEFAULT 'manual',
  employee_id uuid REFERENCES profiles(id),
  total_cost numeric GENERATED ALWAYS AS (estimated_hours * hourly_cost) STORED,
  created_at timestamptz DEFAULT now()
);

-- 3. Role default costs
CREATE TABLE public.role_default_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  role_title text NOT NULL,
  level text,
  hourly_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, role_title, level)
);

-- 4. Employee cost overrides
CREATE TABLE public.employee_cost_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  hourly_cost numeric NOT NULL,
  effective_from date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, employee_id)
);

-- 5. Service packages
CREATE TABLE public.service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  description text,
  list_price numeric NOT NULL DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Package items
CREATE TABLE public.package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id),
  quantity integer DEFAULT 1,
  duration_months integer DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  sort_order integer DEFAULT 0
);

-- 7. Proposals
CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  client_id uuid REFERENCES clients(id),
  name text NOT NULL,
  status text DEFAULT 'draft',
  version integer DEFAULT 1,
  notes text,
  assumptions text,
  discount_percent numeric DEFAULT 0,
  valid_until date,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. Proposal items
CREATE TABLE public.proposal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id),
  package_id uuid REFERENCES service_packages(id),
  item_type text DEFAULT 'service',
  custom_name text,
  custom_description text,
  quantity integer DEFAULT 1,
  duration_months integer DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  sort_order integer DEFAULT 0
);

-- 9. Proposal snapshots
CREATE TABLE public.proposal_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- 10. Indexes
CREATE INDEX idx_service_role_costs_service ON service_role_costs(service_id);
CREATE INDEX idx_service_role_costs_company ON service_role_costs(company_id);
CREATE INDEX idx_role_default_costs_company ON role_default_costs(company_id);
CREATE INDEX idx_employee_cost_overrides_company ON employee_cost_overrides(company_id);
CREATE INDEX idx_service_packages_company ON service_packages(company_id);
CREATE INDEX idx_package_items_package ON package_items(package_id);
CREATE INDEX idx_proposals_company ON proposals(company_id);
CREATE INDEX idx_proposals_client ON proposals(client_id);
CREATE INDEX idx_proposal_items_proposal ON proposal_items(proposal_id);
CREATE INDEX idx_proposal_snapshots_proposal ON proposal_snapshots(proposal_id);
CREATE INDEX idx_services_department ON services(department_id);
CREATE INDEX idx_services_company_active ON services(company_id, is_active);

-- 11. Enable RLS
ALTER TABLE public.service_role_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_default_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_cost_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_snapshots ENABLE ROW LEVEL SECURITY;

-- 12. RLS Policies - service_role_costs
CREATE POLICY "Users can view service_role_costs in their company"
  ON public.service_role_costs FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_roles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage service_role_costs"
  ON public.service_role_costs FOR ALL TO authenticated
  USING (public.is_company_admin_or_manager(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin_or_manager(auth.uid(), company_id));

-- 13. RLS Policies - role_default_costs
CREATE POLICY "Users can view role_default_costs in their company"
  ON public.role_default_costs FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_roles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage role_default_costs"
  ON public.role_default_costs FOR ALL TO authenticated
  USING (public.is_company_admin_or_manager(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin_or_manager(auth.uid(), company_id));

-- 14. RLS Policies - employee_cost_overrides
CREATE POLICY "Users can view employee_cost_overrides in their company"
  ON public.employee_cost_overrides FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_roles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage employee_cost_overrides"
  ON public.employee_cost_overrides FOR ALL TO authenticated
  USING (public.is_company_admin_or_manager(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin_or_manager(auth.uid(), company_id));

-- 15. RLS Policies - service_packages
CREATE POLICY "Users can view service_packages in their company"
  ON public.service_packages FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_roles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage service_packages"
  ON public.service_packages FOR ALL TO authenticated
  USING (public.is_company_admin_or_manager(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin_or_manager(auth.uid(), company_id));

-- 16. RLS Policies - package_items (via package company)
CREATE POLICY "Users can view package_items"
  ON public.package_items FOR SELECT TO authenticated
  USING (package_id IN (
    SELECT id FROM service_packages WHERE company_id IN (
      SELECT company_id FROM user_company_roles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Admins can manage package_items"
  ON public.package_items FOR ALL TO authenticated
  USING (package_id IN (
    SELECT id FROM service_packages sp WHERE public.is_company_admin_or_manager(auth.uid(), sp.company_id)
  ))
  WITH CHECK (package_id IN (
    SELECT id FROM service_packages sp WHERE public.is_company_admin_or_manager(auth.uid(), sp.company_id)
  ));

-- 17. RLS Policies - proposals
CREATE POLICY "Users can view proposals in their company"
  ON public.proposals FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM user_company_roles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage proposals"
  ON public.proposals FOR ALL TO authenticated
  USING (public.is_company_admin_or_manager(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin_or_manager(auth.uid(), company_id));

-- 18. RLS Policies - proposal_items (via proposal company)
CREATE POLICY "Users can view proposal_items"
  ON public.proposal_items FOR SELECT TO authenticated
  USING (proposal_id IN (
    SELECT id FROM proposals WHERE company_id IN (
      SELECT company_id FROM user_company_roles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Admins can manage proposal_items"
  ON public.proposal_items FOR ALL TO authenticated
  USING (proposal_id IN (
    SELECT id FROM proposals p WHERE public.is_company_admin_or_manager(auth.uid(), p.company_id)
  ))
  WITH CHECK (proposal_id IN (
    SELECT id FROM proposals p WHERE public.is_company_admin_or_manager(auth.uid(), p.company_id)
  ));

-- 19. RLS Policies - proposal_snapshots (via proposal company)
CREATE POLICY "Users can view proposal_snapshots"
  ON public.proposal_snapshots FOR SELECT TO authenticated
  USING (proposal_id IN (
    SELECT id FROM proposals WHERE company_id IN (
      SELECT company_id FROM user_company_roles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Admins can manage proposal_snapshots"
  ON public.proposal_snapshots FOR ALL TO authenticated
  USING (proposal_id IN (
    SELECT id FROM proposals p WHERE public.is_company_admin_or_manager(auth.uid(), p.company_id)
  ))
  WITH CHECK (proposal_id IN (
    SELECT id FROM proposals p WHERE public.is_company_admin_or_manager(auth.uid(), p.company_id)
  ));
