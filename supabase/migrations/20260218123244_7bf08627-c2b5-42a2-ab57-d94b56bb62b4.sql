
-- Create time_entries table
CREATE TABLE public.time_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_minutes integer DEFAULT 0,
  description text,
  is_running boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Users can view their own entries
CREATE POLICY "Users can view own time entries"
ON public.time_entries FOR SELECT
USING (auth.uid() = user_id);

-- Admin/Manager can view all entries
CREATE POLICY "Admin/Manager can view all time entries"
ON public.time_entries FOR SELECT
USING (is_admin_or_manager(auth.uid()));

-- Users can create their own entries
CREATE POLICY "Users can create own time entries"
ON public.time_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own entries
CREATE POLICY "Users can update own time entries"
ON public.time_entries FOR UPDATE
USING (auth.uid() = user_id);

-- Admin/Manager can manage all entries
CREATE POLICY "Admin/Manager can manage all time entries"
ON public.time_entries FOR ALL
USING (is_admin_or_manager(auth.uid()));

-- Users can delete their own entries
CREATE POLICY "Users can delete own time entries"
ON public.time_entries FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_time_entries_updated_at
BEFORE UPDATE ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;

-- Index for performance
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_task_id ON public.time_entries(task_id);
CREATE INDEX idx_time_entries_project_id ON public.time_entries(project_id);
CREATE INDEX idx_time_entries_is_running ON public.time_entries(user_id, is_running) WHERE is_running = true;
