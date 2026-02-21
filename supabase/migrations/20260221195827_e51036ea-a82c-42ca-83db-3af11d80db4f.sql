
-- Add new columns to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS sector text DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website text DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tax_id text DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS secondary_phone text DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL;

-- Add sector to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS sector text DEFAULT NULL;
