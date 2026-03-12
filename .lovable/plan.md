

# Media Planning Module — Full Rebuild

## Current State
- `ProjectMediaPlan.tsx` (1949 lines) lives inside the project detail as a tab — works but is project-scoped only
- DB has `media_plans` (name, project_id, status, total_budget, agency_fee_percentage) and `media_plan_items` (medium, placement, budget, dates, objective, phase, etc.)
- `MediaPlanningPage.tsx` is a Coming Soon placeholder
- No standalone media plans index page exists
- No right-side detail panel, no task bundles, limited channel taxonomy, no standalone routing

## Scale of Work
This is an extremely large module (~20+ distinct features). To deliver quality without breaking things, I recommend splitting into **3 implementation phases**. This plan covers **Phase 1** (core structure + index + workspace) which is already substantial.

---

## Phase 1: Core Module (this implementation)

### 1. Database Schema Changes

**Alter `media_plans` table** — add fields for standalone operation:
```sql
ALTER TABLE media_plans ADD COLUMN client_id UUID REFERENCES clients(id);
ALTER TABLE media_plans ADD COLUMN period_start DATE;
ALTER TABLE media_plans ADD COLUMN period_end DATE;
ALTER TABLE media_plans ADD COLUMN owner_id UUID REFERENCES profiles(id);
ALTER TABLE media_plans ADD COLUMN objective TEXT;
ALTER TABLE media_plans ADD COLUMN currency TEXT DEFAULT 'EUR';
ALTER TABLE media_plans ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE media_plans ADD COLUMN company_id UUID REFERENCES companies(id);
```

**Alter `media_plan_items` table** — add missing fields from spec:
```sql
ALTER TABLE media_plan_items ADD COLUMN title TEXT;
ALTER TABLE media_plan_items ADD COLUMN category TEXT;
ALTER TABLE media_plan_items ADD COLUMN subchannel TEXT;
ALTER TABLE media_plan_items ADD COLUMN funnel_stage TEXT;
ALTER TABLE media_plan_items ADD COLUMN audience TEXT;
ALTER TABLE media_plan_items ADD COLUMN geography TEXT;
ALTER TABLE media_plan_items ADD COLUMN message_summary TEXT;
ALTER TABLE media_plan_items ADD COLUMN daily_budget NUMERIC;
ALTER TABLE media_plan_items ADD COLUMN kpi_target TEXT;
ALTER TABLE media_plan_items ADD COLUMN priority TEXT DEFAULT 'medium';
ALTER TABLE media_plan_items ADD COLUMN owner_id UUID REFERENCES profiles(id);
ALTER TABLE media_plan_items ADD COLUMN duration INTEGER;
ALTER TABLE media_plan_items ADD COLUMN tags TEXT[];
ALTER TABLE media_plan_items ADD COLUMN color TEXT;
ALTER TABLE media_plan_items ADD COLUMN cost_type TEXT;
ALTER TABLE media_plan_items ADD COLUMN approval_needed BOOLEAN DEFAULT false;
ALTER TABLE media_plan_items ADD COLUMN dependency_id UUID REFERENCES media_plan_items(id);
```

**New junction table for multi-task linking:**
```sql
CREATE TABLE media_plan_item_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_plan_item_id UUID REFERENCES media_plan_items(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(media_plan_item_id, task_id)
);
```

**RLS policies** following existing patterns (company-scoped via project or direct company_id).

### 2. Channel Taxonomy Table
```sql
CREATE TABLE media_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  group_name TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0
);
```
Seed with all channels from the spec (Paid Digital, Organic/Owned, PR/Earned, Offline/Hybrid, Internal/CRM). Default rows with `company_id = NULL` and `is_default = true`.

### 3. Page 1: Media Plans Index (`/media-planning`)

**New file:** `src/pages/MediaPlanning.tsx`

Features:
- PageHeader with breadcrumbs (Work > Media Planning)
- Table view showing: Plan Name, Client, Project, Owner, Period, Status, Total Budget, Actions count, Channels count, Progress, Last Updated
- Group by tabs: All, By Client, By Project, By Status, By Owner
- Actions: New Media Plan, Create from Project, Duplicate, Archive, Export
- Uses existing `TableToolbar` pattern for column visibility, saved views, export
- Click row → navigate to `/media-planning/:id`

### 4. Page 2: Media Plan Workspace (`/media-planning/:id`)

**New file:** `src/pages/MediaPlanWorkspace.tsx`

This is the main workspace, split into sub-components:

**A. Header Section**
- Plan title (inline editable), Client, Project links, Period, Owner, Status badge, Total Budget
- Quick action buttons: Add Action, Create Tasks, Group By, Filter, Export

**B. Smart Summary Bar**
- KPI strip: Total Budget, Allocated, Remaining, Actions count, Active Channels, Linked Tasks, Date Range
- Color-coded budget health indicator

**C. Main Workspace — 3 views**

1. **Table View** — Enhanced spreadsheet:
   - Columns: Title, Channel, Placement, Category, Objective, Funnel Stage, Owner, Start/End, Duration, Budget, Daily Budget, KPI, Status, Priority, Linked Tasks, Notes
   - Inline editing (existing `EditableCell` + `SelectCell` patterns)
   - Sticky header + first column
   - Group by: Channel, Objective, Funnel Stage, Owner, Status, Phase, Month
   - Row drag reorder, multi-select, bulk actions
   - Summary rows per group with budget totals
   - Add row inline

2. **Gantt View** — Enhanced from existing:
   - Day/Week/Month/Quarter zoom
   - Color by channel/status/objective (toggle)
   - Today line, dependency lines
   - Group collapse/expand
   - Click bar → opens detail panel

3. **Calendar View** — Enhanced from existing:
   - Month/Week modes
   - Color coding by channel/status
   - Click item → opens detail panel

**D. Right Detail Panel**
- Slide-out panel (using `Sheet` or resizable panel)
- Shows full action details when a row/item is selected
- Sections: Basic Info, Planning, Execution (linked deliverable, tasks, dependencies), Messaging, Activity
- Quick edit all fields
- Task linking: link existing, create single task, create task bundle

### 5. Task Integration

**Task Bundle Templates** (hardcoded initially):
- Newsletter: Brief, Copy, Design, Review, Setup, QA, Send, Reporting
- Paid Media: Brief, Asset Creation, Copy, Setup, Tracking, QA, Launch, Optimization, Reporting
- Social Media: Brief, Copy, Design, Scheduling, Community, Reporting
- Event: Planning, Logistics, Promotion, Execution, Follow-up, Reporting

Create tasks via `supabase.from('tasks').insert(...)` linked back via `media_plan_item_tasks`.

### 6. Status System for Actions
```
Draft → Planned → Ready for Production → In Production → Ready to Launch → Live → Completed
                                                                                    ↗
                                                              On Hold / Cancelled ←
```

### 7. Routing & Navigation

- Add routes: `/media-planning` and `/media-planning/:id`
- Add sidebar nav item under Work section
- Remove the old redirect from `/intelligence/media-planning`
- Keep `ProjectMediaPlan` component in project detail as-is (it still works for project-scoped view), but add a link "Open in Workspace" that navigates to `/media-planning/:planId`

### 8. Export
- CSV/Excel export of current filtered view (existing pattern from `TableToolbar`)
- PDF export deferred to Phase 2

---

## Files to Create/Edit

| File | Action |
|------|--------|
| **Migration SQL** | Schema changes above |
| `src/pages/MediaPlanning.tsx` | New — Index page |
| `src/pages/MediaPlanWorkspace.tsx` | New — Workspace page |
| `src/components/media-plan/MediaPlanHeader.tsx` | New — Header + summary bar |
| `src/components/media-plan/MediaPlanTable.tsx` | New — Enhanced spreadsheet view |
| `src/components/media-plan/MediaPlanGantt.tsx` | New — Enhanced Gantt |
| `src/components/media-plan/MediaPlanCalendar.tsx` | New — Enhanced Calendar |
| `src/components/media-plan/MediaPlanDetailPanel.tsx` | New — Right panel |
| `src/components/media-plan/MediaPlanTaskBundles.tsx` | New — Task creation |
| `src/components/media-plan/channelTaxonomy.ts` | New — Channel groups/constants |
| `src/components/media-plan/mediaConstants.ts` | New — Statuses, objectives, funnel stages |
| `src/App.tsx` | Add routes |
| `src/components/layout/SidebarNavGroup.tsx` | Add nav item |

## Phase 2 (future)
- Scenario/version mode
- PDF export templates
- Board/Kanban view
- Copy/paste from Excel
- Locked/approved rows
- Baseline vs current comparison
- Drag-to-resize in Gantt
- Dependency visualization lines

## Phase 3 (future)
- Cross-module integration (Client page shows active plans, Task detail shows media source, Deliverables show related actions)
- Attachment support per action
- Notes/assumptions section
- Advanced formula support

