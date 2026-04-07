

# Tasks Σήμερα — Enhanced UX Upgrade

## Current State
- "Tasks Σήμερα" is a simple list with `lg:col-span-2` (narrower than "Ενεργά Έργα" which is `lg:col-span-3`)
- Each row shows: checkbox + icon + title/project + date + status badge + play/stop button
- No drag reorder, no sort, no row numbers, no inline editing, no subtask expansion, no quick-add

## Changes

### 1. Equal width with "Ενεργά Έργα"
- Change grid from `lg:grid-cols-5` to `lg:grid-cols-2` (equal 50/50 split)
- Both cards get `lg:col-span-1`

### 2. Row numbers (αύξων αριθμός)
- Add sequential index number (`1.`, `2.`, `3.`...) on the left of each task row

### 3. Completion icon — hover-only
- Remove always-visible `Checkbox`
- Show a `Check` circle icon only on hover (`opacity-0 group-hover:opacity-100`)
- Click completes the task as before

### 4. Drag & Drop reorder
- Use `@dnd-kit/core` + `@dnd-kit/sortable` (already installed in the project)
- Wrap task list in `DndContext` + `SortableContext`
- Each row becomes sortable with a drag handle (grip dots icon, visible on hover)
- Maintain local `orderedTasks` state for reorder (client-side only, resets on refresh)

### 5. Sort options
- Add a small sort dropdown button in the card header (next to the count badge)
- Options: `Ημερομηνία` (default), `Προτεραιότητα`, `Project`, `Status`
- Sort is applied before drag reorder (drag reorder only works when sort = manual)

### 6. Inline date & status editing
- **Date**: Click on the date label → show a small date picker popover (using existing `Popover` + `Calendar` components)
- **Status**: Click on the status badge → show a dropdown with all status options from `STATUS_COLORS`
- Both update via `supabase.from('tasks').update(...)` and local state

### 7. Quick add task
- Add an "+ Νέο Task" row at the bottom of the list
- Click reveals an inline text input + project selector (dropdown of user's projects)
- Enter creates a task with `due_date = today`, `status = 'todo'`, `assigned_to = user.id`

### 8. Expandable subtasks
- Add a chevron toggle on tasks that have subtasks (query `parent_task_id`)
- On expand, fetch subtasks from DB and show them indented below the parent
- Subtasks show title + status badge only (compact)

## Technical Details

### Subtask detection
- Fetch subtask counts alongside today tasks: a separate query `select task_id, count(*) from tasks where parent_task_id in (...) group by parent_task_id` or fetch all subtasks for today's task IDs

### Components
All changes are within `src/pages/MyWork.tsx`:
- Refactor the "Tasks Σήμερα" card section into a new inline component or keep it in MyWork
- `TaskRow` component updated with: row number, hover-only complete icon, drag handle, inline date/status editing, subtask expand
- New `QuickAddTask` inline component at bottom

## Files

| File | Change |
|------|--------|
| `src/pages/MyWork.tsx` | Grid layout 50/50, enhanced TaskRow (row numbers, hover complete, drag, inline edit, subtask expand), sort dropdown, quick add row, subtask fetching |

