
# Performance Fix: Task Loading

## Problem
The `fetchTasks` function in `src/pages/Tasks.tsx` (lines 181-191) makes a **separate database query for each task** to fetch the assignee profile. With 100 tasks per page, this creates 100+ individual network requests -- clearly visible in the network logs showing dozens of identical profile fetches.

## Solution
Replace the N+1 query pattern with a single batch query:

1. Collect all unique `assigned_to` IDs from the fetched tasks
2. Make ONE query to `profiles` with `.in('id', uniqueIds)` 
3. Map profiles client-side using a Map lookup

## File to Change
**`src/pages/Tasks.tsx`** -- lines 180-191

Replace:
```typescript
const tasksWithAssignees = await Promise.all((data || []).map(async (task) => {
  if (task.assigned_to) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', task.assigned_to)
      .single();
    return { ...task, assignee: profile };
  }
  return { ...task, assignee: null };
}));
```

With:
```typescript
const assigneeIds = [...new Set((data || []).filter(t => t.assigned_to).map(t => t.assigned_to as string))];
let profilesMap = new Map();
if (assigneeIds.length > 0) {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', assigneeIds);
  profilesMap = new Map((profiles || []).map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
}
const tasksWithAssignees = (data || []).map(task => ({
  ...task,
  assignee: task.assigned_to ? profilesMap.get(task.assigned_to) || null : null,
}));
```

This reduces **100+ queries to just 2** (count + tasks + 1 profiles batch), dramatically improving load time.
