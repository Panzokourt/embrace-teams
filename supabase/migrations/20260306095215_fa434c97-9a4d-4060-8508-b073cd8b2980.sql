
-- ============================================================
-- BATCH 1: Multi-Tenant Production Hardening Migration
-- Phase 1: Schema Hardening + Phase 2: Security Functions & RLS
-- ============================================================

-- ============================================================
-- 1A. BACKFILL NULL company_id rows
-- ============================================================

-- Tenders: derive from client
UPDATE public.tenders SET company_id = c.company_id
FROM public.clients c WHERE tenders.client_id = c.id AND tenders.company_id IS NULL;

-- Briefs: derive from project
UPDATE public.briefs SET company_id = p.company_id
FROM public.projects p WHERE briefs.project_id = p.id AND briefs.company_id IS NULL;

-- Project creatives: derive from project
UPDATE public.project_creatives SET company_id = p.company_id
FROM public.projects p WHERE project_creatives.project_id = p.id AND project_creatives.company_id IS NULL;

-- Project templates: assign to first company (all 7 are orphan system templates)
UPDATE public.project_templates SET company_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- ============================================================
-- 1A. SET NOT NULL on all core tables
-- ============================================================

ALTER TABLE public.projects ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.clients ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.tenders ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.contracts ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.services ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.briefs ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.billing_notifications ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.project_templates ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.task_templates ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.project_creatives ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.teams ALTER COLUMN company_id SET NOT NULL;

-- ============================================================
-- 1B. Add company_id to activity_log
-- ============================================================

ALTER TABLE public.activity_log ADD COLUMN company_id uuid REFERENCES public.companies(id);

-- ============================================================
-- 1C. Composite Indexes (only those missing)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ucr_user_company ON public.user_company_roles(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_project ON public.time_entries(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_tenders_company ON public.tenders(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company ON public.contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_company_created ON public.activity_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_company ON public.user_permissions(user_id, company_id);

-- ============================================================
-- 1D. New Enterprise Tables
-- ============================================================

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  entity_type text,
  entity_id text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_notifications_user_company ON public.notifications(user_id, company_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Company admins can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    is_company_admin_or_manager(auth.uid(), company_id)
    OR auth.uid() = created_by
  );

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- API Keys
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  hashed_key text NOT NULL,
  scopes jsonb DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_company ON public.api_keys(company_id);
CREATE INDEX idx_api_keys_prefix ON public.api_keys(key_prefix);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage api keys"
  ON public.api_keys FOR ALL
  TO authenticated
  USING (is_company_admin(auth.uid(), company_id))
  WITH CHECK (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company members can view api keys"
  ON public.api_keys FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT ucr.company_id FROM public.user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() AND ucr.status = 'active'
  ));

-- Webhooks
CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_url text NOT NULL,
  subscribed_events text[] NOT NULL DEFAULT '{}',
  secret text,
  is_active boolean NOT NULL DEFAULT true,
  failure_count integer NOT NULL DEFAULT 0,
  last_triggered_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhooks_company ON public.webhooks(company_id);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage webhooks"
  ON public.webhooks FOR ALL
  TO authenticated
  USING (is_company_admin(auth.uid(), company_id))
  WITH CHECK (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company members can view webhooks"
  ON public.webhooks FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT ucr.company_id FROM public.user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() AND ucr.status = 'active'
  ));

-- Feature Flags
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  key text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  rollout_type text NOT NULL DEFAULT 'boolean',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, key)
);

CREATE INDEX idx_feature_flags_company ON public.feature_flags(company_id);
CREATE INDEX idx_feature_flags_key ON public.feature_flags(key);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage feature flags"
  ON public.feature_flags FOR ALL
  TO authenticated
  USING (
    company_id IS NULL 
    OR is_company_admin(auth.uid(), company_id)
  )
  WITH CHECK (
    is_company_admin(auth.uid(), company_id)
  );

CREATE POLICY "Company members can view feature flags"
  ON public.feature_flags FOR SELECT
  TO authenticated
  USING (
    company_id IS NULL 
    OR company_id IN (
      SELECT ucr.company_id FROM public.user_company_roles ucr 
      WHERE ucr.user_id = auth.uid() AND ucr.status = 'active'
    )
  );

-- ============================================================
-- 2A. Refactor is_super_admin to be company-scoped
-- Keep the old 1-param version for backward compat but make it
-- check only the user's active company. Add 2-param version.
-- ============================================================

-- New company-scoped version (preferred)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles
    WHERE user_id = _user_id 
    AND company_id = _company_id
    AND role IN ('owner', 'super_admin')
    AND status = 'active'
  )
$$;

-- ============================================================
-- 2B. Fix activity_log RLS — make company-scoped
-- ============================================================

DROP POLICY IF EXISTS "Admin/Manager can view all activity" ON public.activity_log;

CREATE POLICY "Admin/Manager can view company activity"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (
    -- Own activity always visible
    auth.uid() = user_id
    OR
    -- Company-scoped admin check (works for rows with company_id)
    (company_id IS NOT NULL AND is_company_admin_or_manager(auth.uid(), company_id))
    OR
    -- Legacy fallback for rows without company_id yet
    (company_id IS NULL AND is_admin_or_manager(auth.uid()))
  );

-- Update INSERT policy to require company_id going forward
DROP POLICY IF EXISTS "Active users can create activity logs" ON public.activity_log;

CREATE POLICY "Active users can create activity logs"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    is_active_user(auth.uid()) AND auth.uid() = user_id
  );

-- ============================================================
-- 2B. Fix clients RLS — remove NULL tolerance, use company-scoped
-- ============================================================

DROP POLICY IF EXISTS "Admin/Manager can manage company clients" ON public.clients;
DROP POLICY IF EXISTS "Admin/Manager can view company clients" ON public.clients;

CREATE POLICY "Admin/Manager can manage company clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (is_company_admin_or_manager(auth.uid(), company_id))
  WITH CHECK (is_company_admin_or_manager(auth.uid(), company_id));

CREATE POLICY "Admin/Manager can view company clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (is_company_admin_or_manager(auth.uid(), company_id));

-- ============================================================
-- 2B. Fix teams RLS — remove NULL tolerance
-- ============================================================

DROP POLICY IF EXISTS "Admin/Manager can manage company teams" ON public.teams;

CREATE POLICY "Admin/Manager can manage company teams"
  ON public.teams FOR ALL
  TO authenticated
  USING (is_company_admin_or_manager(auth.uid(), company_id))
  WITH CHECK (is_company_admin_or_manager(auth.uid(), company_id));

-- ============================================================
-- 2B. Fix project_templates RLS — remove NULL tolerance
-- ============================================================

DROP POLICY IF EXISTS "Active users can view project templates" ON public.project_templates;

CREATE POLICY "Active users can view project templates"
  ON public.project_templates FOR SELECT
  TO authenticated
  USING (
    is_active_user(auth.uid()) 
    AND is_active = true 
    AND company_id = get_user_company_id(auth.uid())
  );

-- ============================================================
-- 2A. Fix companies update policy to use company-scoped is_super_admin
-- ============================================================

DROP POLICY IF EXISTS "Super admin can update company" ON public.companies;

CREATE POLICY "Super admin can update company"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid(), id))
  WITH CHECK (is_super_admin(auth.uid(), id));

-- ============================================================
-- 2A. Fix rbac_audit_log policy
-- ============================================================

DROP POLICY IF EXISTS "Super admin can view audit log" ON public.rbac_audit_log;

CREATE POLICY "Super admin can view audit log"
  ON public.rbac_audit_log FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid(), company_id));

-- ============================================================
-- Enable realtime for notifications
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
