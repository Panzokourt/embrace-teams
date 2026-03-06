

# Plan: Project Header Cleanup + Task Detail Improvements

## 1. Remove date/time line from project header
**File**: `src/pages/ProjectDetail.tsx` (lines 330-340)

Remove the sub-info row that shows dates, duration, and timer badge since they already appear in the right-side info card. Keep only the client name, but make it a clickable link.

## 2. Make client name clickable
**File**: `src/pages/ProjectDetail.tsx` (line 331)

Change the `<span>` to a `<Link to={/clients/${project.client_id}}>` so clicking the client name navigates to the client detail page.

## 3. Remove folder dropdown
**File**: `src/pages/ProjectDetail.tsx` (lines 299-326)

Remove the entire folder dropdown from the header.

## 4. Task detail — move status/date/people info into card on right panel
The right panel already has Assignment, Timeline, Status Flow, and Properties cards (lines 631-765). The sticky action bar (lines 354-433) has inline status, priority, due date, and assignee chips. The user wants these consolidated into the cards. This is already mostly done — the action bar is a quick-access bar. I'll keep the action bar minimal (back + title + timer + complete toggle) and ensure the right panel cards are the primary source for metadata.

Actually looking at screenshot 3, the user is showing the action bar items. Let me keep status in the action bar but ensure the right panel cards are prominent and complete.

## 5. Multi-assignee support for tasks
**Database**: Create a `task_assignees` junction table (`task_id`, `user_id`) to support multiple assignees. Keep `assigned_to` on tasks for backward compatibility / primary assignee.

**File**: `src/pages/TaskDetail.tsx` — Update the Assignment card to show multiple avatars and allow adding/removing assignees via a multi-select popover.

## 6. Status Flow — make stages clearer
**File**: `src/pages/TaskDetail.tsx` (lines 686-722)

The current dots are tiny (h-6 w-6) with no labels. Redesign:
- Larger dots or pill-shaped steps
- Show the label below each step (not just "Todo" and "Done" at edges)
- Current step highlighted with contrasting color and label text
- Past steps show checkmark with success color
- Better connector lines

---

### Summary of changes

| File | Change |
|---|---|
| `src/pages/ProjectDetail.tsx` | Remove date/timer sub-info line; make client name a clickable Link; remove folder dropdown |
| `src/pages/TaskDetail.tsx` | Redesign Status Flow with visible labels per step; improve Assignment card UI |
| New migration | Create `task_assignees` table for multi-assignee support |
| `src/pages/TaskDetail.tsx` | Add multi-assignee logic (fetch, display, add/remove) in Assignment card |

