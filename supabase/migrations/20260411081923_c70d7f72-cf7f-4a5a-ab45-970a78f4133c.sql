ALTER TABLE public.email_messages 
  ADD COLUMN IF NOT EXISTS is_brief_candidate boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS brief_parsed_at timestamptz;