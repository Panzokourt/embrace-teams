

# Αναβάθμιση Task Tables — Πίνακας, Kanban, Gantt & Dependencies

## Σύνοψη αλλαγών (7 αιτήματα)

1. **Καθαρότερος πίνακας** — Εναλλαγή χρώματος γραμμών (striped rows), σαφέστερα borders, μικρότερο padding
2. **Πολλαπλοί assignees στον πίνακα** — Χρήση του υπάρχοντος `task_assignees` table, εμφάνιση stacked avatars
3. **Avatar στήλη υπευθύνου** — Εμφάνιση avatar εικόνων αντί text
4. **Αφαίρεση εικονιδίου ExternalLink** — Από τη στήλη τίτλου
5. **Inline subtask creation** — Αντί dialog, δημιουργία subtask inline στο table row (ήδη μερικώς υλοποιημένο, θα διορθωθεί ώστε να αποθηκεύει κατευθείαν μέσω Supabase αντί να καλεί `onCreateSubtask` που ανοίγει dialog)
6. **Αντικατάσταση Card view με Gantt view** — Νέο μοντέρνο Gantt chart (reuse/enhance existing `ProjectGanttView`)
7. **Compact Kanban cards** — Μικρά cards default, expand on hover
8. **Task dependencies** — Νέος `task_dependencies` table (many-to-many, με `dependency_type`) αντί single `depends_on` UUID

---

## Database Migration

Νέος πίνακας `task_dependencies` για many-to-many dependencies:

```sql
CREATE TABLE public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, depends_on_task_id)
);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dependencies"
  ON public.task_dependencies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/manager can manage dependencies"
  ON public.task_dependencies FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));
```

---

## Αλλαγές ανά αρχείο

### 1. `src/components/ui/unified-view-toggle.tsx`
- Αντικατάσταση `card` option με `gantt` (icon: `GanttChartSquare`, label: "Gantt")
- Type: `'gantt' | 'table' | 'kanban'`

### 2. `src/components/tasks/TasksTableView.tsx`
- **Striped rows**: Εναλλαγή `bg-muted/30` σε ζυγές γραμμές
- **Borders**: Πιο ορατά `border-b` σε κάθε cell
- **Αφαίρεση ExternalLink** button από title cell
- **Multi-assignee**: Fetch `task_assignees` per task, εμφάνιση overlapping avatar group (max 3 + "+N")
- **Inline subtask**: Το `handleAddSubtask` δημιουργεί κατευθείαν insert στη Supabase (αντί callback σε dialog), refetch after
- Πέρασμα `onInlineCreateSubtask` callback αντί `onCreateSubtask`

### 3. `src/pages/Tasks.tsx`
- Αντικατάσταση `renderCardView` με `renderGanttView` — reuse/adapt `ProjectGanttView` component
- Fetch `task_assignees` batch (single query) μαζί με tasks, map σε `assignees: Profile[]` per task
- `handleCreateSubtask` → inline insert (χωρίς dialog), parent_task_id set
- **Kanban cards**: Default compact (title + avatar only), on hover expand με priority, due date, project name. Transition animation.

### 4. `src/components/projects/ProjectTasksTable.tsx`
- Ίδιες αλλαγές multi-assignee & inline subtask

### 5. `src/components/tasks/TaskGanttView.tsx` (NEW)
- Standalone Gantt component for the Tasks page (all projects)
- Βασισμένο στο `ProjectGanttView` αλλά χωρίς deliverable grouping — groups by project ή status
- Modern design: rounded bars, progress fill, dependency arrows (SVG lines)
- Zoom: week/month toggle
- Color-coded bars from `STATUS_COLORS`

### 6. `src/components/tasks/TaskDependencySelector.tsx` (NEW)
- Popover component για add/remove dependencies σε task
- Εμφανίζεται στο task detail page και στο table (future)
- Dropdown search tasks → add dependency (finish_to_start default)

---

## Kanban compact design
- Default card height: ~40px (title only + small avatar)
- On `group-hover` / card hover: expand to full height showing priority badge, due date, project, actions
- CSS transition: `max-height` + `opacity` animation

## Τεχνικά σημεία
- Δεν αλλάζει η δομή του `assigned_to` field (backward compat) — ο πίνακας απλά δείχνει επιπλέον τα `task_assignees`
- Gantt view: client-side rendering με CSS grid, no external library
- Dependencies θα φαίνονται ως γραμμές στο Gantt view (SVG overlay)

