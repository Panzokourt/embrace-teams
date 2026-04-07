

# Task Progress & Status — Subtask-Driven Logic

## Κανόνες

1. **Χωρίς subtasks**: Η πρόοδος βασίζεται στο `STATUS_PROGRESS[status]` (ήδη λειτουργεί)
2. **Με subtasks**: Η πρόοδος υπολογίζεται ως μέσος όρος `STATUS_PROGRESS` των subtasks
3. **Αυτόματο parent status**: Όταν αλλάζει κατάσταση ενός subtask:
   - Αν **όλα** τα subtasks = `completed` → parent γίνεται `completed`
   - Αν **κάποιο** subtask δεν είναι `todo` → parent γίνεται `in_progress`
   - Αν **όλα** `todo` → parent μένει `todo`
4. **Block status change**: Αν υπάρχουν subtasks, ο χρήστης **δεν μπορεί** να αλλάξει χειροκίνητα το status του parent (εκτός αν όλα τα subtasks είναι completed)

## Αλλαγές

### `src/pages/TaskDetail.tsx`
- **`handleStatusChange`**: Αν υπάρχουν subtasks, block αλλαγές με toast warning ("Η κατάσταση καθορίζεται από τα subtasks") εκτός αν status → completed και όλα τα subtasks completed
- **`toggleSubtaskStatus`** & stepper/status UI στα subtasks: Μετά την αλλαγή status subtask, υπολογίζει αυτόματα το parent status και κάνει update
- **`displayProgress`**: Αντί completed/total, χρησιμοποιεί `avg(STATUS_PROGRESS[subtask.status])` για πιο granular πρόοδο
- **Stepper bar**: Disable click αν `subtasks.length > 0` (visual indication: cursor-not-allowed, opacity)
- **Status popover στο action bar**: Ίδια λογική — disabled αν υπάρχουν subtasks

### `src/components/my-work/TaskSidePanel.tsx`
- Ίδια λογική: αν task έχει subtasks, progress = avg(STATUS_PROGRESS) των subtasks, status read-only

### `src/components/tasks/TasksTableView.tsx`
- Για tasks με subtasks, fetch subtask statuses και υπολόγισε progress από αυτά (ή fallback σε STATUS_PROGRESS[parent.status])

### `src/components/projects/ProjectTasksManager.tsx`
- Ίδια λογική: μετά αλλαγή status, αν είναι subtask → auto-update parent

## Technical Details

```typescript
// Helper function
const computeParentStatus = (subtasks: {status: TaskStatus}[]): TaskStatus => {
  if (subtasks.every(s => s.status === 'completed')) return 'completed';
  if (subtasks.some(s => s.status !== 'todo')) return 'in_progress';
  return 'todo';
};

const computeSubtaskProgress = (subtasks: {status: TaskStatus}[]): number => {
  if (subtasks.length === 0) return 0;
  const total = subtasks.reduce((sum, s) => sum + (STATUS_PROGRESS[s.status] ?? 0), 0);
  return Math.round(total / subtasks.length);
};
```

## Files

| File | Αλλαγή |
|------|--------|
| `src/pages/TaskDetail.tsx` | Block parent status change when subtasks exist, auto-update parent on subtask change, granular progress |
| `src/components/my-work/TaskSidePanel.tsx` | Read-only status when subtasks exist, subtask-based progress |
| `src/components/projects/ProjectTasksManager.tsx` | Auto-update parent after subtask status change |
| `src/components/tasks/TasksTableView.tsx` | Subtask-aware progress calculation |

