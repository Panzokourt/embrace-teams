
-- Add new values to task_status enum
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'internal_review';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'client_review';

-- Add internal_reviewer column to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS internal_reviewer uuid REFERENCES profiles(id);

-- RLS: internal_reviewer can view tasks assigned for internal review
CREATE POLICY "Users can view tasks for internal review"
ON tasks FOR SELECT
USING (auth.uid() = internal_reviewer);

-- RLS: internal_reviewer can update task status
CREATE POLICY "Internal reviewers can update task status"
ON tasks FOR UPDATE
USING (auth.uid() = internal_reviewer)
WITH CHECK (auth.uid() = internal_reviewer);
