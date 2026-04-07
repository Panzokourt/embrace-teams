

# Calendar: Multi-Day Task Spanning, Time Entry Integration & Remaining Hours

## Πρόβλημα
Τώρα ένα task με 10 estimated hours εμφανίζεται ως ένα μεγάλο block που ξεπερνάει τις εργάσιμες ώρες χωρίς να "σπάει" στην επόμενη μέρα. Επίσης οι καταγεγραμμένες ώρες (time entries) δεν φαίνονται στο ημερολόγιο και δεν αφαιρούνται από τις estimated hours.

## Λύση

### 1. Fetch time entries στο ημερολόγιο
Το `MyWorkCalendar` θα κάνει fetch τα `time_entries` του χρήστη (με `start_time`, `duration_minutes`, `task_id`) για τις ημέρες που εμφανίζονται. Αυτά θα εμφανίζονται ως **ξεχωριστά blocks** στο ημερολόγιο, στην ώρα/ημέρα που καταγράφηκαν, με διαφορετική απόχρωση (π.χ. `bg-emerald-500/10` — "logged time").

### 2. Υπολογισμός remaining hours
Για κάθε task: `remainingHours = max(0, estimatedHours - totalLoggedHours)`. Το `totalLoggedHours` υπολογίζεται από τα completed time entries (`is_running = false`) του task.

### 3. Multi-day task spanning
Αντί να render ένα τεράστιο block, ο calendar θα "σπάει" ένα task σε πολλαπλά blocks:
- Υπολογίζει τις διαθέσιμες εργάσιμες ώρες από το `start_time` του task μέχρι το τέλος εκείνης της εργάσιμης ημέρας
- Αν `remainingHours > availableHoursToday`, τοποθετεί ένα block μέχρι το τέλος του ωραρίου και μεταφέρει τις υπόλοιπες ώρες στην επόμενη εργάσιμη ημέρα (στην αρχή του ωραρίου)
- Συνεχίζει μέχρι εξαντλήσει τις remaining hours

### 4. Time entries ως blocks στο ημερολόγιο (real-time)
Κάθε completed time entry εμφανίζεται ως ξεχωριστό block (πράσινη απόχρωση) στην ώρα `start_time`, με ύψος ανάλογο `duration_minutes / 60 * ROW_HEIGHT`. Εμφανίζει τίτλο task + διάρκεια. Realtime subscription στον πίνακα `time_entries` ώστε μόλις καταγραφεί νέο entry να εμφανιστεί αμέσως.

### 5. Ενημέρωση Props
Η `TaskItem` interface δεν αλλάζει. Τα time entries είναι ξεχωριστό dataset.

## Technical Details

```text
Task: "Website Redesign" | estimated: 10h | logged: 2h | remaining: 8h
Work schedule: 09:00–17:00 (8h/day)

Day 1 (task starts 09:00):
  [09:00–17:00] ──── 8h planned block ────
Day 2 (continuation):
  [09:00–09:00] ──── 0h (remaining 0) ────
  
If logged 2h already:
  remaining = 10 - 2 = 8h
Day 1: [09:00–17:00] 8h
Day 2: No spillover needed
```

### Splitting algorithm
```typescript
function splitTaskIntoBlocks(task, startDate, workScheduleMap, loggedHours) {
  const remaining = Math.max(0, (task.estimated_hours || 1) - loggedHours);
  const blocks = [];
  let hoursLeft = remaining;
  let currentDay = startDate;
  
  while (hoursLeft > 0) {
    const ws = workScheduleMap[currentDay.getDay()];
    if (!ws?.is_working_day) { currentDay = addDays(currentDay, 1); continue; }
    
    const startH = parseInt(ws.start_time.split(':')[0]);
    const endH = parseInt(ws.end_time.split(':')[0]);
    const taskStartH = blocks.length === 0 ? parseTaskDate(task.due_date).getHours() || startH : startH;
    const available = endH - taskStartH;
    const blockHours = Math.min(hoursLeft, available);
    
    blocks.push({ taskId: task.id, day: currentDay, startHour: taskStartH, hours: blockHours });
    hoursLeft -= blockHours;
    currentDay = addDays(currentDay, 1);
  }
  return blocks;
}
```

### Time entries rendering
```typescript
// Fetch
const { data } = await supabase.from('time_entries')
  .select('id, task_id, start_time, duration_minutes, task:tasks(title)')
  .eq('user_id', user.id)
  .eq('is_running', false)
  .gte('start_time', weekStartISO)
  .lte('start_time', weekEndISO);

// Render as blocks at their start_time with height = (duration_minutes/60)*ROW_HEIGHT
```

### Realtime subscription
```typescript
supabase.channel('time-entries-calendar')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries', filter: `user_id=eq.${user.id}` }, () => {
    fetchTimeEntries();
  }).subscribe();
```

## Files

| File | Αλλαγή |
|------|--------|
| `src/components/my-work/MyWorkCalendar.tsx` | Fetch time entries, split tasks into multi-day blocks based on work schedule and remaining hours, render time entry blocks with green styling, add realtime subscription |

