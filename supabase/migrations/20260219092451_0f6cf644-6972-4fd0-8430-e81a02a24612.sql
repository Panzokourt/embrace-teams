
-- Phase 1A: Migrate company_role enum
-- Step 1: Add new values to enum
ALTER TYPE company_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE company_role ADD VALUE IF NOT EXISTS 'viewer';
ALTER TYPE company_role ADD VALUE IF NOT EXISTS 'billing';
ALTER TYPE company_role ADD VALUE IF NOT EXISTS 'member';
