ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS workspace_type TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_preset JSONB;