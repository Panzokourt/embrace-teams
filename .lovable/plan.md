

# Project Detail Page -- Task-Centric Restructuring

## Summary

Transform the Project Detail page from a tab-heavy dashboard layout to a task-centric 2-column workspace. Tasks become the core of the page (always visible), while project metadata moves to a compact right panel. Tabs are reduced to secondary views only.

---

## New Layout Structure

```text
+------------------------------------------------------------------+
| [<] Project Name     [Status▼] [Folder▼]  [Progress] [Timer]     |
|     Client · 1 Jan → 30 Jun · Σε 126 ημέρες                      |
|     [Add Task] [Add Deliverable]                                  |
+------------------------------------------------------------------+
|                                        |                          |
|  MAIN TASK ENGINE (75%)                |  PROJECT PANEL (25%)     |
|                                        |                          |
|  A. View Switcher                      |  1. Summary Card         |
|  [List] [Kanban] [Timeline]            |     - Progress bars      |
|                                        |     - Tasks X/Y          |
|  B. Quick Filter Bar (sticky)          |     - Deliverables X/Y   |
|  All | My Tasks | Overdue | This Week  |     - Days remaining     |
|  | Completed | By Deliverable          |                          |
|                                        |  2. Team Card            |
|  C. Task List                          |     - Avatars + roles    |
|  [x] Task title  @user  15 Feb  ●High  |     - Active tasks count |
|  [ ] Task title  @user  20 Mar  ●Med   |                          |
|  [ ] Task title  @user  -       ●Low   |  3. Description Card     |
|  ...                                   |     - Inline editable    |
|                                        |     - Budget, dates      |
|  D. Secondary Tabs (below tasks)       |                          |
|  Deliverables | Files | Media Plan     |  4. AI Analysis (mini)   |
|  | Creatives | Financials              |     - Upload trigger     |
|                                        |                          |
+------------------------------------------------------------------+
```

---

## Detailed Changes

### 1. Sticky Header (Simplified)

Keep the existing header structure but make it sticky:
- Project Name, Status dropdown, Folder dropdown, Timer badge (already exist)
- Add primary "Add Task" button and secondary "Add Deliverable" button
- Keep client name, date range, due date countdown
- Keep progress bar
- Make the entire header `sticky top-0 z-10`

### 2. Remove Tab-First Architecture

The current page uses Tabs as the primary navigation (Overview, Deliverables, Tasks, etc.). The new layout:
- **Remove the top-level Tabs wrapper** that controls the entire page
- Tasks are **always visible** as the main content area (no tab needed)
- Secondary features (Deliverables, Files, Media Plan, Creatives, Financials) move to **secondary tabs below the task list**
- Comments/History moves into the secondary tabs as well

### 3. Left Column -- Main Task Engine (flex-1, ~75%)

**A. View Switcher**
- Reuse existing `UnifiedViewToggle` or simple toggle buttons: List | Kanban | Timeline
- Default to List view
- Store preference in localStorage

**B. Quick Filter Bar (sticky below header)**
- Horizontal pill buttons: All | My Tasks | Overdue | Due This Week | Completed | By Deliverable
- "By Deliverable" groups tasks under their deliverable headers
- Filters applied client-side on the task list

**C. Task List (Enhanced inline)**
- Embed `TasksPage` (already exists as `embedded` mode) with the project filter
- Each task row shows: Checkbox, Title (inline edit), Assignee avatar, Due date, Priority dot, Status dropdown, Subtask progress
- Hover reveals quick actions (comment, attach, log time)
- This is essentially the existing Tasks page in embedded mode with filters on top

**D. Secondary Tabs (Below the task area)**
- Smaller tab bar for: Παραδοτέα | Αρχεία | Media Plan | Δημιουργικά | Οικονομικά | Σχόλια
- These render the existing components: `ProjectDeliverablesTable`, `FileExplorer`, `ProjectMediaPlan`, `ProjectCreatives`, `ProjectFinancialsHub`, `ProjectCommentsAndHistory`

### 4. Right Column -- Compact Project Panel (w-80, ~25%)

**Card 1: Project Summary**
- Overall progress (combined bar)
- Tasks: X/Y completed with mini progress bar
- Deliverables: X/Y completed with mini progress bar
- Days remaining (with color coding)
- Budget display

**Card 2: Team**
- Compact `ProjectTeamManager` (already has `compact` prop)
- Show active tasks count per member (future enhancement)

**Card 3: Description & Details**
- Inline editable description
- Budget, Agency Fee (inline edit)
- Start/End dates (inline date pickers)
- This replaces the large `ProjectInfoEditor` card

**Card 4: AI Analysis (Mini)**
- Collapsed by default, expandable
- File upload trigger
- Shows AI suggestions when files are uploaded

---

## What Gets Removed/Simplified

- **Remove**: Top-level Tabs as page architecture (replaced by always-visible tasks + secondary tabs)
- **Remove**: "Overview" tab concept (its contents are distributed: KPIs to right panel, tasks to main area, comments to secondary tab)
- **Remove**: Large "Πληροφορίες Έργου" card (replaced by compact description card in right panel)
- **Remove**: "Πρόσφατα Tasks" card (redundant -- full task list is always visible)
- **Remove**: KPI cards row (data moves to right panel summary card)
- **Simplify**: AI Analysis block (moves to collapsible mini card in right panel)

---

## Technical Details

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/ProjectDetail.tsx` | Complete restructure: remove top-level Tabs, implement 2-column layout with tasks as main content, add quick filter bar, move metadata to right panel, add secondary tabs below task area |

### Task Filter Implementation

```text
Filters (client-side on fetched tasks):
- All: no filter
- My Tasks: task.assigned_to === user.id
- Overdue: task.due_date < today && status !== 'completed'
- Due This Week: task.due_date within current week
- Completed: task.status === 'completed'
- By Deliverable: group tasks by deliverable_id
```

### Layout Structure (JSX)

```text
<div sticky header />
<div className="flex gap-6">
  <div className="flex-1">   <!-- 75% -->
    <ViewSwitcher />
    <FilterBar />
    <TasksPage embedded projectId={id} />
    <SecondaryTabs>
      <Deliverables />
      <Files />
      <MediaPlan />
      <Creatives />
      <Financials />
      <Comments />
    </SecondaryTabs>
  </div>
  <div className="w-80 shrink-0">  <!-- 25% -->
    <SummaryCard />
    <TeamCard />
    <DescriptionCard />
    <AICard />
  </div>
</div>
```

### Add Task / Add Deliverable Buttons

- "Add Task" opens the task creation flow (navigate to task creation or inline dialog)
- "Add Deliverable" opens deliverable creation (existing flow in `ProjectDeliverablesTable`)
- Both pre-fill `project_id`

