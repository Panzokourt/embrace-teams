
-- Add approver column to tasks table
ALTER TABLE public.tasks ADD COLUMN approver uuid;

-- Add RLS policy: approvers can view tasks assigned to them for approval
CREATE POLICY "Users can view tasks they need to approve"
ON public.tasks
FOR SELECT
USING (auth.uid() = approver);
