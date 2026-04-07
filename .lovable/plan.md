

# Calendar Tab — Full Day/Week Calendar with Time Slots, Drag & Drop, Important Dates

## Current State
The "Ημερολόγιο" tab in MyWork shows a simple grid with task cards per day (week view) or a flat list (day view). No time slots, no drag & drop, no important dates, no ability to create tasks by clicking on time slots.

## Changes

### 1. New `MyWorkCalendar` Component
Replace the inline calendar in MyWork with a dedicated `src/components/my-work/MyWorkCalendar.tsx` component that handles both week and day views with hourly time slots.

**Week View**: 7-column grid with hour rows (08:00–22:00). Each cell is a droppable time slot. Tasks with `due_date` (containing time) are placed in the correct hour slot. Tasks without time appear in an "All Day" row at top.

**Day View**: Single column with hour rows, same logic but wider task cards.

### 2. Time Slot Click → Create Task
Clicking an empty time slot opens a quick task creation dialog (or inline row) pre-filled with the clicked date+time as `due_date`.

### 3. Drag & Drop Tasks
- Tasks without a set time can be dragged from the "All Day" row into a specific hour slot → updates `due_date` with that time
- Tasks already in a time slot can be dragged to another slot (same day or different day in week view) → updates `due_date`
- Uses `@hello-pangea/dnd` (already in project) or native HTML5 drag

### 4. Important Dates (Milestones)
Fetch and display important dates as colored markers/banners at the top of each day column:
- **Project start/end dates** (`projects.start_date`, `projects.end_date`) — from user's active projects
- **Contract start/end dates** (`contracts.start_date`, `contracts.end_date`)
- **Deliverable due dates** (`deliverables.due_date`)

These appear as small colored pills/badges in the day header, not as draggable items.

### 5. Task Placement Logic
- `due_date` contains a timestamp (e.g. `2026-04-07T14:00:00`) → place in the 14:00 slot
- `due_date` is date-only (midnight) or time not meaningful → place in "All Day" section
- Detection: if hours/minutes are both 0 (midnight), treat as all-day

## Technical Details

- New component: `src/components/my-work/MyWorkCalendar.tsx`
- Data: reuses `allMyTasks` from MyWork + fetches milestones (projects, contracts, deliverables)
- Drag uses native HTML5 drag events (`onDragStart`, `onDragOver`, `onDrop`) for simplicity
- On drop: `supabase.from('tasks').update({ due_date: newDateTime })` then refresh
- On time slot click: opens a minimal dialog to create task with pre-set date/time
- `MyWork.tsx`: replaces the inline calendar card content with `<MyWorkCalendar />`

## Files

| File | Change |
|------|--------|
| `src/components/my-work/MyWorkCalendar.tsx` | New — full calendar with hourly time slots, drag & drop, milestone markers, click-to-create |
| `src/pages/MyWork.tsx` | Replace inline calendar view with `<MyWorkCalendar>`, pass tasks/projects data and callbacks |

