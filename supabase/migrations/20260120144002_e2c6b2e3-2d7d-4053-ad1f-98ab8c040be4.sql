-- Add status column back to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'pending';