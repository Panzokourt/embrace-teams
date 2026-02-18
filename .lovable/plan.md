
# Σελίδα "My Work" - Προσωπικός Χώρος Παραγωγικότητας

## Ιδέα

Μία focused σελίδα `/my-work` που δείχνει **μόνο ό,τι αφορά τον συνδεδεμένο χρήστη** -- τα tasks του, τα projects του, τα deadlines του, τις εκκρεμότητες και τις άδειές του. Σχεδιασμένη για **σήμερα** και **αυτή την εβδομάδα**, χωρίς θόρυβο.

## Layout

```text
+------------------------------------------------------------------+
| Καλημέρα, Γιώργο                        [Timer: 01:23:45] [Stop] |
| Δευτέρα 18 Φεβρουαρίου 2026                                      |
+------------------------------------------------------------------+
|                                                                    |
| -- ΣΗΜΕΡΑ --                                                       |
| +-------------------+  +-------------------+  +------------------+ |
| | Tasks Σήμερα: 5   |  | Ωρες Σήμερα: 3.5h |  | Overdue: 2      | |
| +-------------------+  +-------------------+  +------------------+ |
|                                                                    |
| [My Tasks - Σήμερα]                              [Δες ολα ->]     |
| +----------------------------------------------------------------+ |
| | # | Task              | Project    | Priority | Due    | Timer | |
| | 1 | Σχεδίαση banner   | Project A  | High     | Today  | [>]  | |
| | 2 | Review copy       | Project B  | Medium   | Today  | [>]  | |
| | 3 | Send report       | Project C  | Low      | Today  |      | |
| +----------------------------------------------------------------+ |
|                                                                    |
| -- ΑΥΤΗ ΤΗΝ ΕΒΔΟΜΑΔΑ --                                           |
| [Upcoming Tasks]                                                   |
| +----------------------------------------------------------------+ |
| | Task              | Project    | Due      | Status             | |
| | Approve visuals   | Project A  | Wed      | todo               | |
| | Final delivery    | Project D  | Fri      | in_progress        | |
| +----------------------------------------------------------------+ |
|                                                                    |
| +---------------------------+  +-------------------------------+   |
| | Τα Εργα μου (active)      |  | Quick Links                   |  |
| | - Project A (65%)         |  | [+ Νεο Task]                  |  |
| | - Project B (30%)         |  | [+ Καταχωρηση Χρονου]         |  |
| | - Project C (80%)         |  | [+ Αιτηση Αδειας]             |  |
| +---------------------------+  | [Ημερολογιο]                  |  |
|                                | [Timesheets]                   |  |
| +---------------------------+  +-------------------------------+   |
| | Αδειες & Απουσιες        |                                      |
| | Κανονικη: 12/20 ημερες   |                                      |
| | Ασθενεια: 1/15            |                                      |
| | Pending: 1 αιτηση         |                                      |
| +---------------------------+                                      |
+------------------------------------------------------------------+
```

## Sections αναλυτικα

### 1. Header με χαιρετισμο + Active Timer
- "Καλημερα/Καλησπερα, [Ονομα]" -- context-aware (ωρα ημερας)
- Ημερομηνια σημερα
- Active timer: αν τρεχει timer, εμφανιζεται inline με elapsed + stop button + task name

### 2. KPI Strip (3 μικρες καρτες)
- **Tasks σημερα**: πλήθος tasks με due_date = today + overdue
- **Ωρες σημερα**: απο time_entries σημερα
- **Overdue**: tasks που εχουν περασει due_date και δεν ειναι completed

### 3. My Tasks - Today (κυρια ενοτητα)
- Tasks assigned στον χρηστη με due_date = today ΚΑΙ overdue
- Inline status change (checkbox click -> completed)
- Timer button: ξεκιναει timer για το task
- Priority badges (high = κοκκινο, medium = κιτρινο, low = γκρι)
- Link "Δες ολα" -> `/work?tab=tasks`

### 4. Upcoming Tasks - This Week
- Tasks assigned στον χρηστη με due_date αυτη την εβδομαδα (εκτος σημερα)
- Ομαδοποιηση ανα ημερα (Τριτη, Τεταρτη...)
- Compact list view

### 5. My Projects (compact cards)
- Projects οπου ο χρηστης ειναι στο team (project_user_access)
- Μονο active projects
- Progress bar + status
- Click -> `/projects/:id`

### 6. Quick Links
- "+ Νεο Task" -> `/work?tab=tasks&new=true`
- "+ Καταχωρηση Χρονου" -> `/hr?tab=timesheets`
- "+ Αιτηση Αδειας" -> `/hr?tab=leaves`
- "Ημερολογιο" -> `/work?tab=calendar`
- "Timesheets μου" -> `/hr?tab=timesheets`

### 7. Leave Balance (μικρη καρτα)
- Υπολοιπο αδειων ανα τυπο (κανονικη, ασθενεια κλπ)
- Αριθμος pending αιτησεων
- Link "Δες ολα" -> `/hr?tab=leaves`

## Νεα Αρχεια

- `src/pages/MyWork.tsx` -- Κυρια σελιδα

## Αλλαγες σε υπαρχοντα

- `src/App.tsx` -- Νεα route `/my-work`
- `src/components/layout/AppSidebar.tsx` -- Προσθηκη link "My Work" στην κορυφη (πανω απο Dashboard), icon: `CircleUser` ή `LayoutList`

## Technical Details

### Data Queries (ολα filtered by `auth.uid()`)

1. **Tasks σημερα + overdue**: `tasks` where `assigned_to = user.id` AND (`due_date <= today` AND `status != completed`)
2. **Tasks εβδομαδας**: `tasks` where `assigned_to = user.id` AND `due_date` μεταξυ αυριο - τελος εβδομαδας
3. **My projects**: `projects` JOIN `project_user_access` where `user_id = user.id` AND `status = active`
4. **Ωρες σημερα**: `time_entries` where `user_id = user.id` AND `start_time >= today 00:00`
5. **Leave balances**: `leave_balances` where `user_id = user.id` AND `year = current year`
6. **Active timer**: ηδη υπαρχει στο `useTimeTracking` hook

### Pending Leave Approvals (αν ο χρηστης ειναι manager)
Αν ο χρηστης ειναι manager/admin, εμφανιζεται επιπλεον section:
- "Εκκρεμεις εγκρισεις αδειων" με approve/reject buttons
- Compact list, μονο pending requests

### Component Structure

```text
MyWork.tsx
  ├── GreetingHeader (ονομα + ημ/νια + active timer)
  ├── KPI Strip (3 stat cards)
  ├── TodayTasks (table/list με timer buttons)
  ├── WeekTasks (grouped by day)
  ├── MyProjects (compact card grid)
  ├── QuickLinks (button grid)
  ├── LeaveBalanceMini (compact card)
  └── PendingApprovals (αν manager, compact list)
```

### Σειρα Υλοποιησης

1. Δημιουργια `MyWork.tsx` με ολα τα sections
2. Route + Sidebar update
3. Ολα τα data queries σε ενα `useEffect` με `Promise.all`
