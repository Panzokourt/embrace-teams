

# Ημερολόγιο -- Ολική Αναδιαμόρφωση (Φάση 1)

## Σύνοψη

Το Ημερολόγιο γίνεται αυτόνομη ενότητα στο sidebar (νέα κατηγορία) με δικές του υποσελίδες, zoom-based navigation (Ετος → Μήνας → Εβδομάδα → Ημέρα), δημιουργία meetings, backlog panel, και context menu / drag-and-drop. Η σύνδεση με Google Calendar θα γίνει σε Φάση 2.

---

## Δομή Navigation

Νέα κατηγορία "Ημερολόγιο" στο Icon Rail του sidebar, μεταξύ "Εργασίες" και "Επικοινωνία":

```text
Icon Rail:
  Αρχική
  Εργασίες      (αφαιρείται το Calendar sub-link)
  Ημερολόγιο    ← ΝΕΟ (CalendarDays icon)
  Επικοινωνία
  ...
```

Υποσελίδες στο Category Panel:
- **Όλα** (`/calendar`) -- Ενοποιημένο ημερολόγιο (tasks + deliverables + projects + meetings)
- **Campaigns** (`/calendar/campaigns`) -- Digital campaigns timeline
- **Tasks** (`/calendar/tasks`) -- Μόνο tasks
- **Έργα** (`/calendar/projects`) -- Project deadlines και milestones
- **PR & Events** (`/calendar/events`) -- Events, media, PR activities
- **Backlog** (`/calendar/backlog`) -- Items χωρίς ημερομηνία

---

## Zoom-Based Views με Smooth Animation

4 επίπεδα zoom: **Year → Month → Week → Day**

Η αλλαγή view γίνεται με:
1. **Click σε κελί** -- zoom in (π.χ. click μήνα στο Year view → Month view εκείνου του μήνα)
2. **Breadcrumb navigation** -- zoom out (π.χ. "2026 > Φεβρουάριος > Εβδ. 8" -- click "2026" → Year view)
3. **Keyboard**: scroll wheel ή +/- για zoom in/out

Κάθε transition χρησιμοποιεί CSS `transform: scale()` + `opacity` animation (~300ms) για smooth zoom effect.

### Year View
- 12 μήνες σε grid 4x3
- Κάθε μήνας δείχνει mini calendar + event count dots
- Click σε μήνα → zoom in σε Month view

### Month View (υπάρχον, βελτιωμένο)
- Κλασικό grid 7 στηλών
- Events σαν colored bars
- Click σε ημέρα → zoom in σε Day view
- Double-click σε κενό → δημιουργία meeting

### Week View
- 7 στήλες, ώρες στον κατακόρυφο άξονα (08:00-22:00)
- Time blocks για meetings
- Drag to create meeting
- Drag to reschedule

### Day View
- Λεπτομερές ωράριο (30min slots)
- Timeline αριστερά με ώρες
- Δεξί panel με λεπτομέρειες επιλεγμένου event

---

## Database: Meetings Table

```sql
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'meeting',
    -- 'meeting', 'call', 'event', 'reminder', 'pr', 'campaign'
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  location text,
  video_link text,
  color text,
  created_by uuid REFERENCES profiles(id),
  project_id uuid REFERENCES projects(id),
  client_id uuid REFERENCES clients(id),
  recurrence_rule text,   -- RRULE string (φάση 2)
  google_event_id text,   -- Google Calendar sync (φάση 2)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.calendar_event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  status text DEFAULT 'pending', -- 'accepted', 'declined', 'pending', 'tentative'
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_event_attendees;
```

RLS policies για company-scoped access + attendee visibility.

---

## Interactions

### Click
- Click σε event → side panel με λεπτομέρειες
- Click σε κενό slot → quick create meeting dialog
- Click σε ημέρα (Month/Year view) → zoom in

### Right Click (Context Menu)
- Σε event: Edit, Delete, Duplicate, Αλλαγή χρώματος, Link to Project
- Σε κενό: New Meeting, New Reminder, Paste Event

### Drag & Drop
- Drag event σε άλλη ημέρα/ώρα → reschedule (update start_time/end_time)
- Drag from backlog → assign date
- Drag edge of event → resize duration (Week/Day view)

---

## Backlog Panel

Slide-out panel (δεξιά) ή dedicated page (`/calendar/backlog`):
- Tasks χωρίς due_date
- Deliverables χωρίς due_date
- Draft meetings χωρίς ημερομηνία
- Drag from backlog → calendar = assign date
- Filter by project, type

---

## Meeting Creation Dialog

Fields:
- Τίτλος
- Τύπος (Meeting, Call, Event, Reminder)
- Ημερομηνία/Ώρα έναρξης - λήξης
- Ολοήμερο toggle
- Τοποθεσία / Video link
- Attendees (multi-select from team, sends notification)
- Linked Project (optional)
- Linked Client (optional)
- Χρώμα
- Περιγραφή

---

## Technical Details

### Νέα αρχεία

| File | Purpose |
|------|---------|
| `src/pages/CalendarHub.tsx` | Main calendar page with sub-routing |
| `src/components/calendar/CalendarZoomView.tsx` | Core zoom engine (Year/Month/Week/Day) |
| `src/components/calendar/CalendarYearView.tsx` | Year grid (12 months) |
| `src/components/calendar/CalendarMonthView.tsx` | Enhanced month grid |
| `src/components/calendar/CalendarWeekView.tsx` | Week view with time slots |
| `src/components/calendar/CalendarDayView.tsx` | Day detail view |
| `src/components/calendar/CalendarEventDialog.tsx` | Create/edit meeting dialog |
| `src/components/calendar/CalendarBacklog.tsx` | Backlog panel |
| `src/components/calendar/CalendarContextMenu.tsx` | Right-click context menu |
| `src/components/calendar/CalendarEventCard.tsx` | Event display component |
| `src/components/calendar/CalendarFilterTabs.tsx` | Sub-page filter tabs |
| `src/hooks/useCalendarEvents.ts` | CRUD hook for calendar_events |

### Τροποποιημένα αρχεία

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/calendar/*` routes, remove `/calendar` redirect to work |
| `src/components/layout/AppSidebar.tsx` | Add "calendar" category to icon rail, remove calendar from work sub-links |
| `src/pages/Work.tsx` | Remove calendar tab |

### Zoom Animation CSS

```css
.calendar-zoom-enter {
  animation: zoom-in 300ms cubic-bezier(0.32, 0.72, 0, 1);
}
.calendar-zoom-exit {
  animation: zoom-out 300ms cubic-bezier(0.32, 0.72, 0, 1);
}
@keyframes zoom-in {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes zoom-out {
  from { transform: scale(1); opacity: 1; }
  to { transform: scale(1.15); opacity: 0; }
}
```

---

## Φάση 2 (Μελλοντική)

- Google Calendar bi-directional sync
- Recurring events (RRULE)
- Calendar sharing / permissions
- Email invitations σε εξωτερικούς
- Agenda print view

