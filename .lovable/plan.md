

# Task Detail Page -- UX Restructuring

## Summary

Complete restructure of the Task Detail page from the current vertical form layout to a modern 2-column smart layout with a sticky action bar, prioritized subtasks, and consolidated activity tabs.

---

## New Layout Structure

```text
+------------------------------------------------------------------+
| [<] Task Title (inline edit)           [Timer] [Status▼] [Priority] [Due] [Avatar] [Actions...] |
+------------------------------------------------------------------+
|                                        |                          |
|  MAIN WORK AREA (70%)                  |  META PANEL (30%)        |
|                                        |                          |
|  A. Overview Card                      |  1. Assignment Card      |
|  - Description (inline edit)           |     - Assignee           |
|  - Deliverable                         |     - (future: collabs)  |
|  - Project link                        |                          |
|  - Tags (type, category)              |  2. Timeline Card        |
|                                        |     - Start date         |
|  B. Subtasks                           |     - Due date           |
|  - Checkbox list with progress         |     - Created at         |
|  - Add subtask inline                  |     - Estimated time     |
|  - Auto-calculated progress bar        |     - Actual time        |
|                                        |                          |
|  C. Activity Tabs                      |  3. Status Flow Card     |
|  - Discussion (default)               |     - Visual workflow     |
|  - Files                              |     - Clickable stages   |
|  - Time                               |                          |
|  - Activity Log (moved from right)    |                          |
|                                        |                          |
+------------------------------------------------------------------+
```

---

## Detailed Changes

### 1. Sticky Top Header (Action Bar)

Replace the current header + status pill buttons + properties grid with a single compact horizontal bar:

- **Left**: Back button, Task Title (inline editable), Timer button
- **Right**: Status dropdown (colored badge, click to change), Priority indicator (colored dot), Due date chip, Assignee avatar, Quick action buttons (Add subtask, Attach file, Mark complete)
- Sticky positioning (`sticky top-0 z-10 bg-background`)
- Single horizontal row, no wrapping to 2 lines

### 2. Left Column -- Main Work Area (flex-1, ~70%)

**A. Overview Block (Compact summary card)**
- Description: inline editable text area (click to edit, no separate section header needed -- just the text with a hover pencil icon)
- Deliverable: inline select
- Project link: clickable chip
- Type & Category: inline tag selectors
- All in a single compact card with subtle borders

**B. Subtasks Section (Promoted -- shown before tabs)**
- Always visible (not hidden when empty)
- Checkbox list with status icons
- Auto-calculated progress bar based on completed subtasks ratio
- "Add subtask" inline input at the bottom
- Click to navigate to subtask detail
- Smart empty state: "Add your first subtask" CTA

**C. Activity Tabs (4 tabs)**
- Discussion (default) -- existing CommentsSection
- Files -- existing FileExplorer
- Time -- existing TaskTimer + time stats
- Activity Log -- **moved from right sidebar** to here as a tab

### 3. Right Column -- Smart Meta Panel (w-80, ~30%)

Three compact cards stacked vertically:

**Card 1: Assignment**
- Assignee with avatar and inline select to change

**Card 2: Timeline**
- Start date (inline date picker)
- Due date (inline date picker)
- Created at (read-only)
- Estimated hours (inline edit)
- Actual hours (read-only)

**Card 3: Status Flow**
- Visual horizontal workflow: To Do > In Progress > Review > Internal > Client > Done
- Current stage highlighted
- Clickable to change status
- Small connected dots/steps visualization

---

## What Gets Removed/Simplified

- **Remove**: Large properties grid (vertical form layout) -- fields distributed to header bar and right panel
- **Remove**: Status pill buttons row (replaced by dropdown in header + flow card)
- **Remove**: Right sidebar "Ιστορικό" panel (moved to Activity Log tab)
- **Remove**: Separate progress manual slider (auto-calculated from subtasks)
- **Remove**: "Σήμανση ως Επείγον" button (priority handled via header indicator)

---

## Technical Details

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/TaskDetail.tsx` | Complete restructure of the render layout; add inline subtask creation; add subtask-based progress; move activity log to tab; new sticky header; new right panel cards; new status flow component |

### New Sub-Components (inline in TaskDetail.tsx or extracted)

- `TaskActionBar` -- sticky header with all quick controls
- `OverviewCard` -- description + deliverable + tags
- `SubtasksBlock` -- checkbox list + progress + add inline
- `AssignmentCard` -- right panel assignee
- `TimelineCard` -- right panel dates/hours
- `StatusFlowCard` -- visual workflow steps

### Subtask Progress Auto-Calculation

```text
progress = (completedSubtasks / totalSubtasks) * 100
```

If no subtasks exist, fall back to manual progress field. When subtasks exist, the progress is always auto-calculated and the manual slider is hidden.

### Add Subtask Inline

- Text input at the bottom of subtasks list
- Enter to create with: `parent_task_id = task.id`, `project_id = task.project_id`, `status = 'todo'`
- Immediately appears in the list

### Status Flow Visual

A horizontal stepper showing all 6 statuses as connected dots/nodes. The current status is highlighted with its color. Clicking a different node changes the status (calls existing `handleStatusChange`).

### Keyboard Shortcuts

- `Cmd/Ctrl + Enter` in description = save
- `/` = focus quick action (future enhancement, not blocking)

