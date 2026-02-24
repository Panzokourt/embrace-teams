
-- Calendar Events table
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'meeting',
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  location text,
  video_link text,
  color text,
  created_by uuid REFERENCES public.profiles(id),
  project_id uuid REFERENCES public.projects(id),
  client_id uuid REFERENCES public.clients(id),
  recurrence_rule text,
  google_event_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Calendar Event Attendees table
CREATE TABLE public.calendar_event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- RLS on calendar_events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view calendar events in their company"
  ON public.calendar_events FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Active users can create calendar events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (
    is_active_user(auth.uid())
    AND company_id = get_user_company_id(auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Admin/Manager can manage calendar events"
  ON public.calendar_events FOR ALL
  USING (
    is_admin_or_manager(auth.uid())
    AND company_id = get_user_company_id(auth.uid())
  );

CREATE POLICY "Creators can update their own events"
  ON public.calendar_events FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Creators can delete their own events"
  ON public.calendar_events FOR DELETE
  USING (created_by = auth.uid());

-- RLS on calendar_event_attendees
ALTER TABLE public.calendar_event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attendees for events in their company"
  ON public.calendar_event_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events e
      WHERE e.id = event_id
      AND e.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Event creators can manage attendees"
  ON public.calendar_event_attendees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events e
      WHERE e.id = event_id
      AND e.created_by = auth.uid()
    )
  );

CREATE POLICY "Admin/Manager can manage all attendees"
  ON public.calendar_event_attendees FOR ALL
  USING (is_admin_or_manager(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_event_attendees;
