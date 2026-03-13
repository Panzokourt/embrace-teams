

# Plan: My Work Page Redesign

## Overview
Complete redesign of the My Work page to be more minimal and project-centric, with expandable project hierarchies, a detail sidebar, approvals section, time tracking widget, and an inline weekly/daily calendar with drag-and-drop task scheduling.

## New Layout Structure

```text
┌─────────────────────────────────────────────────────────────┐
│ Greeting, Name          [KPI chips: 5 tasks | 2h | 1⚠ | 0⏳]│
│ Παρασκευή 13 Μαρτίου    [Level 1 Rookie 23/100 XP]          │
├──────────────────────────────────────┬──────────────────────┤
│                                      │                      │
│  VIEW TOGGLE: [Έργα] [Ημερολόγιο]    │  RIGHT SIDEBAR       │
│                                      │  (detail panel)      │
│  ── PROJECTS VIEW ──                 │                      │
│  ▼ Project A  ░░░░▓▓ 45%  client  5t │  Shows task/deliv    │
│    ▼ Sub-project A1                  │  details when        │
│    ├ Deliverable 1  ● In Progress    │  clicked             │
│    │  ├ Task 1  [✓] [▶] status      │                      │
│    │  └ Task 2  [✓] [▶] status      │  + "Open page" btn   │
│    ├ Deliverable 2                   │                      │
│    └ Task 3 (no deliverable)         │                      │
│  ▶ Project B  ░░▓▓▓ 65%             │                      │
│                                      │                      │
│  ── CALENDAR VIEW ──                 │                      │
│  Week/Day toggle with tasks          │                      │
│  Drag to reorder or move between days│                      │
│                                      │                      │
├──────────────────────────────────────┴──────────────────────┤
│  BOTTOM STRIP (2-col grid):                                 │
│  [Εγκρίσεις & Αιτήματα]     [Time Tracking Widget]         │
│   Sent for approval            Active timer + today stats    │
│   Need my approval             Start/stop, manual entry btn  │
└─────────────────────────────────────────────────────────────┘
```

## Key Changes

### 1. Compact KPI Strip (inline with header)
- Move the 5 KPI cards from full-width grid to **inline badge/chip style** next to the greeting title
- Small pills: "8 tasks", "0h", "2⚠", "0 εγκρ.", XP bar
- Saves significant vertical space

### 2. Projects View (main content — replaces current task tables)
- List all active projects the user participates in (has incomplete tasks, deliverables, invoices, etc.)
- Each project row shows: name, client, progress bar, task count, status
- **Click to expand**: shows sub-projects, then deliverables, then tasks in a tree
- Each item is clickable → opens **Sheet sidebar** (right) with details + "Open page" button
- Tasks show a **completion checkbox** inline

### 3. Calendar View (new tab/toggle)
- Toggle between Projects view and Calendar view
- **Weekly view** (default): 7-day columns, tasks as draggable cards
- **Daily view**: single day with time slots, tasks draggable to reorder
- Drag tasks between days to reschedule (updates `due_date`)
- Each task card has completion checkbox
- Uses existing DnD kit already installed

### 4. Approvals Section (bottom-left)
- Two sub-sections in one card:
  - **Έστειλα για Έγκριση**: tasks where current user is `assigned_to` and status is `internal_review` or `client_review`
  - **Πρέπει να Εγκρίνω**: tasks where user is `internal_reviewer` or `approver` (existing logic)
- Approve/reject buttons inline

### 5. Time Tracking Widget (bottom-right)
- Active timer display with task name, elapsed time, stop button
- Today's logged hours summary
- List of today's time entries (compact)
- Start new timer button (with task selector)
- Link to full Timesheets page

### 6. Detail Sidebar (Sheet)
- Keep existing Sheet but enhance: show deliverable info, project link, timer controls
- "Open full page" button for navigation

## Files to Modify

1. **`src/pages/MyWork.tsx`** — Complete rewrite:
   - Compact header with inline KPI chips
   - Projects tree view with expandable hierarchy (fetch deliverables + tasks per project on expand)
   - Calendar view component (weekly/daily with DnD)
   - Approvals card (sent + received)
   - Time tracking widget
   - Detail sidebar Sheet

2. No new database changes needed — all data already available via existing tables.

## Data Fetching Strategy
- Projects: existing `project_user_access` join with projects
- On project expand: fetch deliverables + tasks for that project
- Approvals "sent": query tasks where `assigned_to = user.id` AND status IN (`internal_review`, `client_review`, `review`)
- Approvals "received": existing `internal_reviewer` / `approver` queries
- Time entries: existing `useTimeTracking` hook + today's entries query
- Calendar: reuse today/week task data, allow drag to change `due_date`

## Implementation Notes
- The page will be significantly shorter and more focused
- Remove: Attention Panel (fold into approvals), Week/Upcoming tables (fold into calendar), Quick Links, Leave Balance cards, Backlog panel
- Keep: DnD for calendar, Sheet for details, XP system
- Approx 800-1000 lines (down from 1277 but more functionality density)

