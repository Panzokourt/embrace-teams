

# Fix Smart Reschedule & Add Rescheduled Indicator

## Problems
1. **AI modifies estimated_hours**: The system prompt tells the AI to split tasks across days using estimated_hours, but the tool schema only has `task_id` and `due_date`. The user reports estimated_hours being changed — this is likely the AI returning extra fields or the frontend misinterpreting data. Need to add explicit instruction "NEVER modify estimated_hours" to the prompt and ensure the frontend only updates `due_date`.
2. **No visual indicator for rescheduled tasks**: When overdue tasks get moved to new dates, there's no trace of the original date or indication that the task was rescheduled.

## Changes

### 1. Database: Add `rescheduled_from` column to tasks
Add a nullable `rescheduled_from` timestamp column to the `tasks` table. When smart reschedule moves a task, the original `due_date` is stored here.

```sql
ALTER TABLE public.tasks ADD COLUMN rescheduled_from timestamptz DEFAULT NULL;
```

### 2. Edge Function: Reinforce no estimated_hours modification
Update the system prompt in `smart-reschedule/index.ts`:
- Add explicit rule: "NEVER change estimated_hours — use the provided values as-is for scheduling duration, but do NOT return them"
- Ensure the tool schema remains `task_id` + `due_date` only (already correct)

### 3. Frontend: Store original date on reschedule
In `MyWorkCalendar.tsx` `handleSmartReschedule`, when updating tasks:
- Save the old `due_date` as `rescheduled_from` before setting the new one
- Only update `due_date` (not estimated_hours — already the case, but verify)

```typescript
// For each assignment, store original due_date
const task = allTasks.find(t => t.id === a.task_id);
await supabase.from('tasks').update({
  due_date: a.due_date,
  rescheduled_from: task?.due_date || null,
}).eq('id', a.task_id);
```

### 4. Calendar: Rescheduled indicator
In the calendar task block rendering, if a task has `rescheduled_from`, show a small icon (e.g. `↻` or a `RefreshCw` icon) with a tooltip showing the original date.

### 5. Tasks views: Rescheduled badge
In task list/table views, show a small "Μεταφέρθηκε" badge or icon next to tasks that have `rescheduled_from` set, with the original date in a tooltip.

## Files

| File | Change |
|------|--------|
| Migration | Add `rescheduled_from` column to `tasks` |
| `supabase/functions/smart-reschedule/index.ts` | Add "NEVER modify estimated_hours" to prompt |
| `src/components/my-work/MyWorkCalendar.tsx` | Save `rescheduled_from` on reschedule, show `↻` icon on rescheduled task blocks |
| `src/components/tasks/TasksTableView.tsx` | Show rescheduled indicator in task rows |

