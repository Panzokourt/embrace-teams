ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS social_accounts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ad_accounts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS strategy jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS additional_websites jsonb DEFAULT '[]'::jsonb;