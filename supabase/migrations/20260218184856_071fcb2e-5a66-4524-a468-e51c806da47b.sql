
-- Step 1: Add new enum values to project_status
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'lead';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'proposal';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'negotiation';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'won';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'lost';

-- Step 2: Add pipeline-specific columns to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS submission_deadline date,
  ADD COLUMN IF NOT EXISTS probability integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS tender_type text,
  ADD COLUMN IF NOT EXISTS won_date date,
  ADD COLUMN IF NOT EXISTS lost_reason text;
