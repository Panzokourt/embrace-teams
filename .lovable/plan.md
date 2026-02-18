
# Time Tracking Module

## Overview
Προσθηκη πληρους συστηματος καταγραφης χρονου εργασιας (time tracking) με timer per task, timesheets, και αναφορες.

## Τι περιλαμβανει

### 1. Database - Νεος πινακας `time_entries`
- `id`, `user_id`, `task_id`, `project_id`
- `start_time` (timestamp), `end_time` (timestamp)
- `duration_minutes` (integer, υπολογισμενο)
- `description` (text, σημειωσεις)
- `is_running` (boolean, αν τρεχει ακομα ο timer)
- `created_at`, `updated_at`
- RLS policies: χρηστες βλεπουν/διαχειριζονται τα δικα τους, admin/manager βλεπουν ολα
- Realtime enabled

### 2. Timer Component (`TaskTimer`)
- Κουμπι Play/Stop σε καθε task (στον πινακα Tasks και στο Task detail)
- Live χρονομετρο που τρεχει real-time
- Δυνατοτητα προσθηκης description μετα το stop
- Εμφανιση τρεχοντος timer στο header/sidebar ως indicator

### 3. Σελιδα Timesheets (`/timesheets`)
- Νεα σελιδα στο sidebar με εικονιδιο `Timer`
- Πινακας με ολες τις καταχωρησεις χρονου
- Φιλτρα: ανα χρηστη, project, ημερομηνια
- Ημερησια/εβδομαδιαια/μηνιαια προβολη
- Manual entry (προσθηκη χρονου χωρις timer)
- Συνολα ωρων ανα ημερα/project/χρηστη
- Export σε CSV/Excel

### 4. Ενσωματωση στα Tasks
- Νεα στηλη "Tracked Time" στον πινακα tasks
- Συγκριση estimated vs actual (tracked) hours
- Progress bar: tracked / estimated
- Ενημερωση `actual_hours` στον πινακα tasks αυτοματα

### 5. Dashboard Widget
- Προσθηκη "Ωρες Σημερα" stat card στο Dashboard
- Τρεχον timer indicator

## Technical Details

### Database Migration
```sql
CREATE TABLE public.time_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
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

-- RLS policies
-- Users manage own entries, admin/manager see all
-- Realtime enabled
```

### Νεα αρχεια
- `src/pages/Timesheets.tsx` - κεντρικη σελιδα
- `src/components/time-tracking/TaskTimer.tsx` - timer component
- `src/components/time-tracking/TimeEntryForm.tsx` - manual entry form
- `src/components/time-tracking/TimesheetTable.tsx` - πινακας entries
- `src/components/time-tracking/ActiveTimerIndicator.tsx` - global indicator
- `src/hooks/useTimeTracking.ts` - hook για timer logic

### Τροποποιησεις υπαρχοντων αρχειων
- `src/App.tsx` - route `/timesheets`
- `src/components/layout/AppSidebar.tsx` - nav item "Timesheets" με εικονιδιο Timer
- `src/components/tasks/TasksTableView.tsx` - στηλη tracked time + timer button
- `src/pages/Tasks.tsx` - timer integration στο kanban view
- `src/pages/Dashboard.tsx` - "Ωρες Σημερα" widget

### Σειρα υλοποιησης
1. Database migration (time_entries + RLS + realtime)
2. useTimeTracking hook (start/stop/manual entry logic)
3. TaskTimer component
4. Timesheets page + table
5. Integration στο Tasks table
6. Dashboard widget
7. Active timer indicator στο sidebar
