
-- ═══════════════════════════════════════════════════════
-- DIGITAL GOVERNANCE MODULE - 9 Tables + RLS + Seed
-- ═══════════════════════════════════════════════════════

-- 1) gov_platforms
CREATE TABLE public.gov_platforms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  icon_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gov_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can manage gov_platforms" ON public.gov_platforms
  FOR ALL USING (is_company_admin_or_manager(auth.uid(), company_id));
CREATE POLICY "Company members can view gov_platforms" ON public.gov_platforms
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_company_roles WHERE user_id = auth.uid() AND company_id = gov_platforms.company_id AND status = 'active'
  ));

-- 2) gov_assets
CREATE TABLE public.gov_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  platform_id uuid NOT NULL REFERENCES public.gov_platforms(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  asset_name text NOT NULL,
  asset_external_id text,
  url text,
  status text NOT NULL DEFAULT 'active',
  owner_entity text,
  billing_owner text,
  created_by_person text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gov_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can manage gov_assets" ON public.gov_assets
  FOR ALL USING (is_company_admin_or_manager(auth.uid(), company_id));
CREATE POLICY "Company members can view gov_assets" ON public.gov_assets
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_company_roles WHERE user_id = auth.uid() AND company_id = gov_assets.company_id AND status = 'active'
  ));

-- 3) gov_access_roles
CREATE TABLE public.gov_access_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  platform_id uuid NOT NULL REFERENCES public.gov_platforms(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  permissions_description text
);
ALTER TABLE public.gov_access_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can manage gov_access_roles" ON public.gov_access_roles
  FOR ALL USING (is_company_admin_or_manager(auth.uid(), company_id));
CREATE POLICY "Company members can view gov_access_roles" ON public.gov_access_roles
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_company_roles WHERE user_id = auth.uid() AND company_id = gov_access_roles.company_id AND status = 'active'
  ));

-- 4) gov_access_grants
CREATE TABLE public.gov_access_grants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.gov_assets(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  person_email text,
  person_type text NOT NULL DEFAULT 'internal',
  role_id uuid REFERENCES public.gov_access_roles(id) ON DELETE SET NULL,
  role_name_override text,
  granted_on date,
  granted_by text,
  removal_date date,
  status text NOT NULL DEFAULT 'active',
  last_review_date date,
  review_cycle_days integer NOT NULL DEFAULT 90,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gov_access_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can manage gov_access_grants" ON public.gov_access_grants
  FOR ALL USING (is_company_admin_or_manager(auth.uid(), company_id));
CREATE POLICY "Company members can view gov_access_grants" ON public.gov_access_grants
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_company_roles WHERE user_id = auth.uid() AND company_id = gov_access_grants.company_id AND status = 'active'
  ));

-- 5) gov_security_controls
CREATE TABLE public.gov_security_controls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.gov_assets(id) ON DELETE CASCADE UNIQUE,
  mfa_enabled boolean NOT NULL DEFAULT false,
  mfa_method text NOT NULL DEFAULT 'none',
  backup_admin_present boolean NOT NULL DEFAULT false,
  personal_login_used boolean NOT NULL DEFAULT false,
  recovery_email text,
  recovery_phone text,
  last_password_change_date date,
  password_rotation_policy text NOT NULL DEFAULT 'none',
  risk_level text NOT NULL DEFAULT 'medium',
  risk_score integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gov_security_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can manage gov_security_controls" ON public.gov_security_controls
  FOR ALL USING (is_company_admin_or_manager(auth.uid(), company_id));
CREATE POLICY "Company members can view gov_security_controls" ON public.gov_security_controls
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_company_roles WHERE user_id = auth.uid() AND company_id = gov_security_controls.company_id AND status = 'active'
  ));

-- 6) gov_vault_references
CREATE TABLE public.gov_vault_references (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.gov_assets(id) ON DELETE CASCADE,
  vault_provider text NOT NULL DEFAULT 'Other',
  vault_location text,
  vault_entry_name text,
  last_verified_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gov_vault_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can manage gov_vault_references" ON public.gov_vault_references
  FOR ALL USING (is_company_admin_or_manager(auth.uid(), company_id));
CREATE POLICY "Company members can view gov_vault_references" ON public.gov_vault_references
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_company_roles WHERE user_id = auth.uid() AND company_id = gov_vault_references.company_id AND status = 'active'
  ));

-- 7) gov_audit_events (IMMUTABLE - INSERT only, no UPDATE/DELETE)
CREATE TABLE public.gov_audit_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  asset_id uuid REFERENCES public.gov_assets(id) ON DELETE SET NULL,
  actor_name text NOT NULL,
  event_type text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gov_audit_events ENABLE ROW LEVEL SECURITY;

-- INSERT only for admin/manager
CREATE POLICY "Admin/Manager can insert gov_audit_events" ON public.gov_audit_events
  FOR INSERT WITH CHECK (is_company_admin_or_manager(auth.uid(), company_id));
-- SELECT for all company members
CREATE POLICY "Company members can view gov_audit_events" ON public.gov_audit_events
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_company_roles WHERE user_id = auth.uid() AND company_id = gov_audit_events.company_id AND status = 'active'
  ));
-- NO UPDATE/DELETE policies = immutable

-- 8) gov_review_tasks
CREATE TABLE public.gov_review_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.gov_assets(id) ON DELETE CASCADE,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gov_review_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can manage gov_review_tasks" ON public.gov_review_tasks
  FOR ALL USING (is_company_admin_or_manager(auth.uid(), company_id));
CREATE POLICY "Company members can view gov_review_tasks" ON public.gov_review_tasks
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_company_roles WHERE user_id = auth.uid() AND company_id = gov_review_tasks.company_id AND status = 'active'
  ));

-- 9) gov_checklists
CREATE TABLE public.gov_checklists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_type text NOT NULL,
  title text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gov_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can manage gov_checklists" ON public.gov_checklists
  FOR ALL USING (is_company_admin_or_manager(auth.uid(), company_id));
CREATE POLICY "Company members can view gov_checklists" ON public.gov_checklists
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_company_roles WHERE user_id = auth.uid() AND company_id = gov_checklists.company_id AND status = 'active'
  ));
