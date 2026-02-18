
# Task Detail Page + Βελτιωσεις Tasks & Projects

## Προβληματα που εντοπιστηκαν

1. **Δεν υπαρχει Task Detail Page** -- τα tasks ανοιγουν μονο σε dialog, δεν εχουν δικη τους σελιδα-καρτελα οπως τα projects
2. **Dropdown υπευθυνου αδειο** -- η query φιλτραρει `status = 'active'` αλλα οι 2 απο τους 3 χρηστες εχουν `status = 'pending'`. Πρεπει να εμφανιζονται ολοι οι χρηστες (ή τουλαχιστον active + pending)
3. **Table rows δεν ειναι clickable** -- χρειαζεται να πατησεις το μικρο ExternalLink icon αντι να κανεις click στη γραμμη
4. **Cards/Kanban ανοιγουν dialog αντι σελιδα** -- πρεπει να πηγαινουν στη Task Detail page

## Αλλαγες

### 1. Νεα σελιδα: Task Detail (`/tasks/:id`)

Δομη παρομοια με ProjectDetail:
- **Header**: Πισω button, τιτλος task, status badge, priority badge
- **Info Section**: Project link, assignee, due date, start date, estimated/actual hours, progress, category, type
- **Tabs**:
  - **Overview**: Περιγραφη, inline editing ολων των πεδιων, subtasks list, dependencies
  - **Comments**: CommentsSection (υπαρχει ηδη)
  - **Files**: FileExplorer/FileAttachments (υπαρχει ηδη)
  - **Time Tracking**: Timer + time entries για αυτο το task

### 2. Fix Assignee Dropdown

Αλλαγη query σε ολα τα σημεια (Tasks.tsx, ProjectTasksTable.tsx, ProjectTasksManager.tsx):
- Αντι `.eq('status', 'active')` -> `.in('status', ['active', 'pending'])` ωστε να εμφανιζονται ολοι οι χρηστες που εχουν λογαριασμο

### 3. Clickable Table Rows

Στο `TasksTableView.tsx`:
- Ολοκληρη η TableRow γινεται clickable με `onClick={() => navigate('/tasks/' + task.id)}`
- Cursor pointer στη γραμμη
- Αφαιρεση του μικρου ExternalLink icon (ή αντικατασταση: το icon πηγαινει στο project, η γραμμη στο task)
- Εξαιρεση click propagation στα inline edit cells, checkboxes, actions

### 4. Cards & Kanban -> Navigate αντι Dialog

Στο `Tasks.tsx`:
- Card view: onClick πηγαινει στο `/tasks/:id` αντι `handleEdit(task)`
- Kanban TaskCard: onClick πηγαινει στο `/tasks/:id` αντι `handleEdit(task)`
- Κρατουμε edit/delete μεσα στο card ως secondary actions (hover)

### 5. Projects: Ιδια λογικη στο clickable

Στο `ProjectsTableView.tsx`: Η γραμμη γινεται clickable (navigate στο project detail)

## Νεα αρχεια

- `src/pages/TaskDetail.tsx` -- Σελιδα λεπτομερειων task

## Τροποποιημενα αρχεια

- `src/App.tsx` -- Νεα route `/tasks/:id`
- `src/pages/Tasks.tsx` -- Cards/Kanban navigate αντι dialog, fix fetchUsers query
- `src/components/tasks/TasksTableView.tsx` -- Clickable rows navigate, αφαιρεση/αντικατασταση ExternalLink
- `src/components/projects/ProjectTasksTable.tsx` -- Fix fetchProfiles query, clickable rows
- `src/components/projects/ProjectTasksManager.tsx` -- Fix fetchProfiles query

## Task Detail Page Layout

```text
+--------------------------------------------------+
| <- Πισω στα Tasks                                |
| [Task Title]              [Status: In Progress]  |
|                           [Priority: High]        |
+--------------------------------------------------+
| Project: Project A (link)  |  Assignee: John Doe |
| Due: 25 Feb               |  Start: 20 Feb       |
| Est: 8h  |  Actual: 5.5h  |  Progress: 65%      |
+--------------------------------------------------+
| [Overview] [Comments] [Files] [Time Tracking]     |
+--------------------------------------------------+
|                                                    |
| Περιγραφη:                                        |
| Lorem ipsum dolor sit amet...                     |
|                                                    |
| Subtasks:                                          |
| [x] Research competitors                          |
| [ ] Draft proposal                                |
| [ ] Review with client                            |
|                                                    |
+--------------------------------------------------+
```

## Σειρα Υλοποιησης

1. Δημιουργια `TaskDetail.tsx` με ολα τα sections και inline editing
2. Route `/tasks/:id` στο App.tsx
3. Fix assignee dropdown (αλλαγη query σε 3 αρχεια)
4. Clickable table rows στο TasksTableView + ProjectTasksTable
5. Cards/Kanban navigate στο Tasks.tsx
6. Clickable rows στο ProjectsTableView (αν δεν ειναι ηδη)
