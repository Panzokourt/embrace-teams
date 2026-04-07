

# Calendar Upgrade — Multi-Hour Tasks, AI Scheduling, Working Hours, Time Indicator

## Changes

### 1. Multi-Hour Task Blocks
Tasks placed in a specific hour slot will span multiple rows based on `estimated_hours`. A task with `estimated_hours: 3` starting at 10:00 will visually cover 10:00–13:00 (3 rows of 52px each). Tasks without `estimated_hours` default to 1 hour.

- Add `estimated_hours` to the `TaskItem` interface in `MyWorkCalendar.tsx`
- Render task pills with `position: absolute` inside a relatively-positioned day column, using top/height calculated from hour offset and `estimated_hours`
- Overlap detection: stack overlapping tasks side-by-side (columns)

### 2. Working Hours Highlight
Fetch `work_schedules` for the current user on mount. Highlight working hours with a subtle different background (e.g., `bg-primary/3`). Non-working hours and non-working days get no highlight (remain default). This makes it visually clear which slots are "available."

### 3. Past Hours/Days Greyed Out
Hours and days that have already passed get a `bg-muted/30 opacity-60` treatment. For today, only hours before the current hour are greyed. For past days in week view, the entire column is dimmed.

### 4. Current Time Indicator
A horizontal red line (`border-t-2 border-red-500`) positioned absolutely at the exact current minute within the hour grid. Updates every minute via `setInterval`. Only visible on today's column.

### 5. Day Header Click → Day View
Clicking on a day header (date number or day name) in week view switches to day view for that day: `onCalendarModeChange('day')` + `onCalendarDateChange(clickedDay)`.

### 6. AI Smart Rescheduling ("Έξυπνη Αναδιάταξη")
A button in the calendar header triggers an edge function that:
- Receives all unscheduled + overdue tasks (with priority, estimated_hours)
- Receives the user's `work_schedules` and already-scheduled tasks
- Uses Lovable AI to determine optimal placement based on priority, estimated hours, and available slots
- Returns a list of `{ taskId, new_due_date }` assignments
- Frontend applies the updates via batch `supabase.from('tasks').update()`

## Technical Details

### Task height calculation
```
const ROW_HEIGHT = 52; // matches min-h-[52px]
const taskHeight = (task.estimated_hours || 1) * ROW_HEIGHT;
const taskTop = (taskHour - HOURS[0]) * ROW_HEIGHT + minuteOffset;
```

### Working hours fetch
```typescript
const { data } = await supabase.from('work_schedules').select('*').eq('user_id', user.id);
// Map: dayOfWeek → { start_time, end_time, is_working_day }
```

### Current time line
```typescript
const [now, setNow] = useState(new Date());
useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
// Position: ((now.getHours() - 7) * 52) + (now.getMinutes() / 60 * 52)
```

### AI Edge Function: `supabase/functions/smart-reschedule/index.ts`
- Input: `{ tasks, workSchedule, existingSlots }`
- Calls Lovable AI Gateway with a system prompt that schedules tasks optimally
- Uses tool calling to return structured `{ assignments: [{ task_id, due_date }] }`
- Frontend updates all tasks in parallel

## Files

| File | Change |
|------|--------|
| `src/components/my-work/MyWorkCalendar.tsx` | Multi-hour blocks, working hours highlight, past dimming, current time line, day header click, AI button |
| `supabase/functions/smart-reschedule/index.ts` | New — AI-powered task scheduling edge function |

