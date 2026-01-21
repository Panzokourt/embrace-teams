-- Add new columns to tasks table for enhanced table view
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'task',
ADD COLUMN IF NOT EXISTS task_category text,
ADD COLUMN IF NOT EXISTS is_ai_generated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Add progress column to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- Add progress column to tenders table  
ALTER TABLE public.tenders
ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- Create index on parent_task_id for subtasks queries
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);

-- Create index on depends_on for dependencies queries
CREATE INDEX IF NOT EXISTS idx_tasks_depends_on ON public.tasks(depends_on);