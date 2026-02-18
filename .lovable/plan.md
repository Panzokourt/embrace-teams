

# Fix "Tasks Σήμερα" Logic + Richer Task Rows

## Προβλήματα

1. **Query λογική**: Τώρα φιλτράρει μόνο με `due_date <= today`, αγνοώντας το `start_date`. Επίσης εμφανίζει tasks από projects του χρήστη ακόμα κι αν δεν είναι assignee.
2. **Λίγες πληροφορίες**: Οι γραμμές δείχνουν μόνο τίτλο, project name, priority badge και play button.

## Αλλαγές

### 1. Διόρθωση query "Tasks Σήμερα"

Αντί για σύνθετο `.or()` με project access, η query γίνεται:
- **Μόνο tasks assigned στον χρήστη** (`.eq('assigned_to', user.id)`)
- **Φέρνει ΟΛΑ τα μη-ολοκληρωμένα** tasks του χρήστη και μετά φιλτράρει client-side:
  - `due_date <= today` (overdue + σήμερα)
  - `start_date = today` (ξεκινάνε σήμερα)
  - `due_date = today` (λήγουν σήμερα)

Επίσης select περισσότερα πεδία: `start_date, estimated_hours, actual_hours, progress, task_type, task_category, assigned_to`

### 2. Πιο πλούσιες γραμμές tasks

Κάθε task row θα δείχνει:
- Checkbox + Τίτλος (link στο task detail, όχι στο project)
- Project name (μικρό, κάτω από τον τίτλο)
- **Status badge** (todo, in_progress κλπ)
- **Due date** (formatted, κόκκινο αν overdue)
- **Priority badge**
- **Estimated hours** (αν υπάρχουν)
- Play/Stop button

Ίδια λογική και για week + upcoming rows: προσθήκη priority, due date, estimated hours.

### 3. Task links

Τα links στα tasks θα πηγαίνουν στο `/tasks/:id` αντί `/projects/:id`.

## Αρχείο

- `src/pages/MyWork.tsx` -- Αλλαγή query, interface, UI rows

## Σειρά υλοποίησης

1. Ενημέρωση interface `TaskWithProject` με νέα πεδία
2. Αλλαγή query: fetch assigned tasks, client-side filter για today
3. Ενημέρωση UI rows σε όλα τα sections (Today, Week, Upcoming)
4. Fix links -> `/tasks/:id`
