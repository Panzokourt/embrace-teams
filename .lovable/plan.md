

# My Work -- Backlog Panel, XP Display & XP Bug Fix

## Summary

Three changes: (1) Add a Backlog panel next to "Tasks Today" showing all unscheduled/future tasks that can be dragged into Today, (2) Add XP/Level display in the My Work header, (3) Fix the bug where completing tasks doesn't award XP.

---

## 1. Fix XP Not Awarded on Task Completion (Bug Fix)

**Problem:** In `src/pages/MyWork.tsx`, the functions `toggleTaskComplete` (line 621) and `approveTask` (line 626) update the task status to "completed" but never call `awardTaskXP`. Only the Focus Mode control bar (`FocusControlBar.tsx`) awards XP.

**Fix:** 
- Import `useXPEngine` in MyWork
- In `toggleTaskComplete`: after successful DB update, call `awardTaskXP(user.id, task.id, task.due_date)`
- In `approveTask`: same treatment when status becomes "completed"
- In `approveInternalReview`: when `newStatus === 'completed'`, also award XP

## 2. XP/Level Display in My Work Header

Add the `LevelProgressBar` component (already built) in the header area, right after the greeting or in the KPI strip. Specifically:
- Add a 5th KPI card (or replace/extend the header) showing the user's Level, XP badge, and a small progress bar to the next level
- Use the existing `useUserXP` hook and `XPBadge` / `LevelProgressBar` components

**Implementation:** Add an XP KPI card in the grid (making it 5 columns on large screens, or placing it inline in the header next to the greeting).

## 3. Backlog Panel with Drag-and-Drop to Today

**Concept:** A collapsible "Backlog" section next to "Tasks Today" showing all tasks assigned to the user that have no due_date or have a due_date far in the future (not in today/week/upcoming). Users can drag tasks from Backlog into the Today list, which automatically sets `due_date` to today.

**Data:** 
- In `fetchAll`, add a new query for backlog tasks: tasks assigned to user, not completed, where `due_date IS NULL`
- Store in `backlogTasks` state

**UI Layout:**
- Change the "Tasks Today" section into a 2-column layout on desktop: left = Today tasks (existing), right = Backlog panel
- Both columns are `DndContext` droppable zones
- Use `@dnd-kit/core` `DndContext` with `onDragEnd` that detects cross-container drops
- When a task is dragged from Backlog to Today: update `due_date = today` in DB, move it to todayTasks state
- When a task is dragged from Today to Backlog: set `due_date = null`, move to backlog

**Implementation approach:**
- Wrap both Today and Backlog in a single `DndContext`
- Use `useDroppable` for each container (id: "today" and "backlog")
- Each task row uses `useSortable` (already does)
- On `onDragEnd`: check if `over.id` is in the other container; if so, update DB and move task between states

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/MyWork.tsx` | Add `useXPEngine` import and calls in completion functions; add `useUserXP` for header XP display; add backlog state + fetch; restructure Today section as 2-column with Backlog; handle cross-container drag |

## Technical Notes

- No database changes needed
- No new files needed -- all components (`XPBadge`, `LevelProgressBar`, `useXPEngine`, `useUserXP`) already exist
- The backlog query filters for `due_date IS NULL` tasks assigned to the user
- Cross-container DnD uses `@dnd-kit/core`'s collision detection to identify the target container
