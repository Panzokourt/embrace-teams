
-- Add work_status column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_status text NOT NULL DEFAULT 'offline';

-- Create work_schedules table
CREATE TABLE public.work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '17:00',
  is_working_day boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_of_week)
);

ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedules" ON public.work_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own schedules" ON public.work_schedules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admin/Manager can manage all schedules" ON public.work_schedules
  FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Create work_day_logs table
CREATE TABLE public.work_day_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  scheduled_minutes integer NOT NULL DEFAULT 0,
  actual_minutes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  auto_started boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.work_day_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" ON public.work_day_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own logs" ON public.work_day_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admin/Manager can manage all logs" ON public.work_day_logs
  FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_day_logs;

-- Add updated_at trigger for work_schedules
CREATE TRIGGER update_work_schedules_updated_at
  BEFORE UPDATE ON public.work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
