

# Focus Mode -- Enhanced Task Details & Bug Fixes

## Summary

Enhance the Focus Mode overlay to show full task details in organized sections, fix the sidebar visibility, fix the auto-starting timer bug, add a visible "Complete" button, and center the Play button within the progress ring.

---

## Changes

### 1. Enhanced Task Details in Center Workspace (`src/components/focus/FocusOverlay.tsx`)

Replace the current minimal center view with a sectioned layout showing full task information, similar to the TaskDetail page but styled for the dark Focus Mode aesthetic.

**Sections (scrollable, max-width container, left-aligned text):**

- **Header Section:** Project name (subtitle), task title (large), priority badge, due date, status
- **Description Section:** Full task description in a bordered card with `bg-white/5` background
- **Properties Section:** Key properties in a compact grid (Assignee, Start/Due dates, Estimated hours, Progress bar) -- read-only display, not editable
- **Subtasks Section:** Fetched via `parent_task_id`, shown as a list with status icons and completion states. Each subtask shows its title, status icon, and a strikethrough if completed
- **Files Section:** Fetched from `file_attachments` table filtered by `task_id`, shown as a compact file list with download links

Data fetching: Add queries in FocusContext to also fetch subtasks and file attachments for the current task. Alternatively, fetch them directly in FocusOverlay using `useEffect` when `currentTask` changes.

### 2. Fix Sidebar Always Visible (`src/components/focus/FocusOverlay.tsx`)

The sidebar currently only renders when `upNextTasks.length > 0`. Change this to **always render** the sidebar (even if empty, show "No more tasks" placeholder). Apply the glassmorphism styling properly: `bg-white/5 backdrop-blur-xl border-l border-white/10`.

### 3. Add "Complete Task" Button (`src/components/focus/FocusOverlay.tsx` or `FocusControlBar.tsx`)

The Stop/Finish button (Square icon) already calls `handleFinish` which triggers the success animation and then `completeCurrentTask()`. The issue is the icon is not clear enough. Solutions:
- Add a visible label or tooltip "Ολοκληρώθηκε" next to the Square button
- Or add a separate prominent "Mark Complete" button with a CheckCircle icon in the center workspace area, above the control bar
- Best approach: Add a labeled "Complete" button with CheckCircle icon inside the control bar, replacing the ambiguous Square icon with `Check` + text label

### 4. Fix Timer Auto-Starting Bug (`src/contexts/FocusContext.tsx` + `src/components/focus/FocusControlBar.tsx`)

**Problem:** `enterFocus` sets `sessionStartTime = Date.now()` and `isPaused = false`, which causes the Pomodoro timer in FocusControlBar to start counting immediately (the `useEffect` at line 24 fires because `isPaused` is false and `sessionStartTime` is set).

**Fix:** 
- In `FocusContext.enterFocus`: set `isPaused = true` initially (start in paused state)
- `sessionStartTime` should only be set when the user presses Play
- In FocusControlBar: on `handlePlay`, if `sessionStartTime` is null, set it via a new context method `startSession()`
- Add `startSession` to FocusContext that sets `sessionStartTime = Date.now()` and `isPaused = false`

### 5. Center Play Button in Progress Ring (`src/components/focus/FocusControlBar.tsx`)

**Problem:** The SVG ring is positioned with `absolute -inset-1` making it 82x82px, but the button is 64x64px (w-16 h-16). The offset is: (82-64)/2 = 9px on each side, but `-inset-1` only gives 4px. This causes misalignment.

**Fix:** Change the SVG positioning. The button is 64px, the ring viewBox is 82px. We need the SVG to be centered around the button:
- Make the ring container `relative flex items-center justify-center`
- Set SVG to `absolute` with proper centering: `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[76px] h-[76px]`
- Or adjust the `-inset` value to properly center: use `absolute -inset-[9px]` and adjust SVG size to `w-[82px] h-[82px]`

### 6. Fetch Subtasks & Files for Current Task (`src/components/focus/FocusOverlay.tsx`)

Add state and effects to fetch:
- **Subtasks:** `supabase.from('tasks').select('id, title, status, priority').eq('parent_task_id', currentTask.id)`
- **Files:** `supabase.from('file_attachments').select('id, file_name, file_url, file_type').eq('task_id', currentTask.id)`
- **Assignee name:** `supabase.from('profiles').select('full_name').eq('id', currentTask.assigned_to).single()`

These queries fire when `currentTask.id` changes.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/focus/FocusOverlay.tsx` | Sectioned task detail view (description, properties, subtasks, files), always-visible sidebar |
| `src/components/focus/FocusControlBar.tsx` | Fix Play button centering in ring, rename Stop to "Complete" with Check icon, fix timer logic |
| `src/contexts/FocusContext.tsx` | Start in paused state, add `startSession` method, don't auto-set sessionStartTime |

---

## Technical Notes

- Subtasks query uses existing `parent_task_id` column on tasks table
- Files query uses existing `task_id` column on `file_attachments` table
- No database changes needed
- No new dependencies needed
- The center workspace becomes scrollable (`overflow-y-auto`) since it now has more content
- All new sections use the dark theme styling: `bg-white/5`, `border-white/10`, `text-white/60` etc.

