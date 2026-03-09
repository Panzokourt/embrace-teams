

# Αναβάθμιση σελίδας Έργων: Gantt view, Υπεύθυνοι, Ομαδοποίηση, UI alignment

## Επισκόπηση
Εναρμόνιση της σελίδας Έργων (Projects) με τη λογική και το UI που ήδη υπάρχει στα Tasks: Gantt view, στήλη υπευθύνων με avatars, ομαδοποίηση ανά πελάτη/κατηγορία, και ενοποιημένη διάταξη φίλτρων/toolbar.

## Αλλαγές

### 1. Gantt view στα Projects
**Αρχείο**: `src/components/projects/ProjectGanttView.tsx` (νέο component)

Δημιουργία `ProjectGanttView` βασισμένο στο `TaskGanttView`, αλλά για projects:
- Bars βασισμένα σε `start_date` / `end_date` του project
- Χρώμα bar βάσει project status
- Grouping ανά πελάτη
- Φίλτρα: Status, Client
- Click στο bar → popover με inline edit (status, dates)
- Inline progress indicator στο bar
- Today line, granularity toggle (εβδομάδες/μήνες)

### 2. Στήλη Υπεύθυνοι στο ProjectsTableView
**Αρχείο**: `src/components/projects/ProjectsTableView.tsx`

- Νέα στήλη "Υπεύθυνοι" μετά τον Πελάτη
- Εμφάνιση avatars για `project_lead_id` και `account_manager_id` (stacked)
- Popover click → λεπτομέρειες + αλλαγή lead/manager
- Hover σε avatar → "✕" για αφαίρεση
- Τα props θα περνάνε `users` array και callbacks `onInlineUpdate` για τα πεδία `project_lead_id` / `account_manager_id`

### 3. Ομαδοποίηση ανά Πελάτη & Κατηγορία
**Αρχείο**: `src/components/projects/ProjectsTableView.tsx`

Επέκταση `GROUP_OPTIONS`:
```
{ value: 'status', label: 'Κατάσταση' }
{ value: 'assignee', label: 'Πελάτης' }     // θα χρησιμοποιεί client_id
{ value: 'project', label: 'Κατηγορία' }    // θα χρησιμοποιεί client.sector
```

Στο `groupedProjects` useMemo: νέα cases για `assignee` → group by `client?.name`, και `project` → group by client sector (μέσω `sectorToCategory`).

### 4. UI alignment — Layout όπως Tasks
**Αρχείο**: `src/pages/Projects.tsx`

- Αλλαγή PageHeader layout: τίτλος αριστερά, view toggle + button δεξιά (ίδια γραμμή, όπως Tasks)
- `showGantt` στο `UnifiedViewToggle`
- Κάτω από τον header: φίλτρα (search, status dropdown) σε μία γραμμή
- Render `ProjectGanttView` όταν `viewMode === 'gantt'`
- Fetch users (profiles) για τους υπεύθυνους
- Fetch client sectors μαζί με clients (`sector` field)
- Πέρασμα `users` prop στο `ProjectsTableView`

### 5. Data — Fetch assignee profiles
**Αρχείο**: `src/pages/Projects.tsx`

- Στο `fetchProjects`: select `project_lead_id, account_manager_id` (ήδη υπάρχουν)
- Batch fetch profiles για μοναδικά `project_lead_id` + `account_manager_id` IDs
- Map profiles σε κάθε project object
- Fetch `clients` με `sector` field

---

## Αρχεία

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/components/projects/ProjectGanttView.tsx` | Νέο — Gantt view για projects |
| `src/components/projects/ProjectsTableView.tsx` | Στήλη Υπεύθυνοι, νέα group options (Πελάτης, Κατηγορία) |
| `src/pages/Projects.tsx` | Gantt integration, fetch users, UI alignment, pass users/sectors |

