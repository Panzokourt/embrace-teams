

# Media Planning — Phase 2 & Phase 3 Implementation Plan

This is a very large scope. I recommend splitting into **4 implementation batches** to keep quality high and avoid breaking existing functionality.

---

## Batch 1: Gantt Enhancements + Board/Kanban View + Dependency Lines

### Gantt Improvements (`MediaPlanGantt.tsx`)
- Add **Quarter zoom level** (dayWidth ~2px)
- **Drag-to-resize**: mouse handlers on bar edges to update `start_date`/`end_date` via `onInlineUpdate`
- **Drag-to-move**: mouse down on bar center to shift both dates
- **Color-by toggle**: switch between channel, status, objective coloring (dropdown above gantt)
- **Group collapse/expand**: group rows by channel/status and render collapsible section headers
- **Dependency lines**: render SVG arrows from `dependency_id` item to its dependent, drawn between bar endpoints

### Board/Kanban View
- New component `MediaPlanBoard.tsx`
- Columns by status (or channel/objective via toggle)
- Cards showing title, channel badge, budget, dates, owner avatar
- Drag-and-drop between columns updates status (using existing `@dnd-kit`)
- Add "Board" tab to workspace view switcher

### Files touched
- `MediaPlanGantt.tsx` — major rewrite with drag handlers + SVG dependency layer
- `MediaPlanBoard.tsx` — new component
- `MediaPlanWorkspace.tsx` — add board view tab + pass `onInlineUpdate` to gantt

---

## Batch 2: Locked/Approved Rows + Baseline Comparison + Notes/Attachments

### Database changes
```sql
ALTER TABLE media_plan_items ADD COLUMN is_locked BOOLEAN DEFAULT false;
ALTER TABLE media_plan_items ADD COLUMN approved_at TIMESTAMPTZ;
ALTER TABLE media_plan_items ADD COLUMN approved_by UUID REFERENCES profiles(id);

-- Baseline snapshots
CREATE TABLE media_plan_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_plan_id UUID REFERENCES media_plans(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Baseline',
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

-- Attachments per action
CREATE TABLE media_plan_item_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_plan_item_id UUID REFERENCES media_plan_items(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Locked rows
- Locked rows show a lock icon and disable inline editing
- Only admins/managers can lock/unlock via detail panel or bulk action
- Approved rows get timestamp + approver displayed in detail panel

### Baseline vs Current
- "Save Baseline" button in header stores current items as JSON snapshot
- "Compare with Baseline" toggle shows delta indicators (budget change, date shift) inline in table
- Simple visual: green/red arrows next to changed values

### Attachments in Detail Panel
- New section in `MediaPlanDetailPanel.tsx` for file attachments
- Upload to `project-files` bucket under `media-plan/{planId}/{itemId}/`
- List with download/delete actions

### Notes/Assumptions Section
- Add a plan-level notes field (already exists as `notes` on `media_plans` — may need to add if missing)
- Editable textarea in the header area, collapsible

### Files touched
- Migration SQL
- `MediaPlanTable.tsx` — lock icon, disable editing for locked rows
- `MediaPlanDetailPanel.tsx` — approval section, attachments section
- `MediaPlanHeader.tsx` — baseline save button, notes section
- New `MediaPlanBaselineCompare.tsx` — comparison overlay

---

## Batch 3: PDF Export Templates + Copy/Paste from Excel + Scenario Mode

### PDF Export
- New edge function or client-side generation using the HTML-to-PDF approach
- 4 template options via a dialog:
  1. **Executive Summary** — plan name, client, period, budget summary, channel breakdown chart
  2. **Detailed Plan** — full table with all rows
  3. **Calendar View** — month grid rendered as printable HTML
  4. **Gantt Snapshot** — timeline rendered as printable HTML
- Button in header → opens template chooser → generates PDF

### Copy/Paste from Excel
- Add `onPaste` handler to the table container
- Parse TSV clipboard data into rows
- Map columns by position to fields (Title, Channel, Placement, etc.)
- Preview dialog showing parsed rows before inserting
- Bulk insert via supabase

### Scenario/Version Mode
- `media_plans.version` already exists — use it
- "Duplicate as Version" action creates a copy of the plan with version+1
- Version selector in header to switch between versions
- Side-by-side comparison view (optional, can show as diff table)

### Files touched
- `MediaPlanHeader.tsx` — export button, version selector
- New `MediaPlanExportDialog.tsx` — template chooser + generation
- `MediaPlanTable.tsx` — paste handler
- New `MediaPlanPastePreview.tsx` — preview dialog
- `MediaPlanning.tsx` — duplicate as version action

---

## Batch 4: Cross-Module Integration (Phase 3)

### Client Detail — Active Media Plans
- In `ClientDetail.tsx`, add a new card `ClientMediaPlansCard` showing media plans where `client_id` matches
- Shows plan name, status, budget, period, action count
- Click navigates to `/media-planning/:id`

### Task Detail — Media Action Source
- In `TaskDetail.tsx`, query `media_plan_item_tasks` for the task
- If linked, show a badge/card: "From Media Plan: [Plan Name] → [Action Title]"
- Click navigates to workspace with item selected

### Deliverables — Related Media Actions
- In `ProjectDeliverablesTable.tsx`, for each deliverable, query `media_plan_items` where `deliverable_id` matches
- Show count badge or expandable list of linked media actions

### Project Overview — Media Plan Block
- In `ProjectDetail.tsx` overview tab, add a card showing linked media plans
- Shows plan count, total budget allocated, active actions count
- "Open in Workspace" link

### Files touched
- New `ClientMediaPlansCard.tsx`
- `ClientDetail.tsx` — add the card
- `TaskDetail.tsx` — add media source section
- `ProjectDeliverablesTable.tsx` — add linked actions indicator
- `ProjectDetail.tsx` — add media plans overview card

### Advanced Formula Support (deferred)
- This would require a custom expression parser — recommend deferring to a later phase or using a library like `hot-formula-parser`
- Scope: calculated columns (e.g., Budget / Duration = Daily Budget auto-calc)
- For now, auto-calculate `duration` from dates and `daily_budget` from budget/duration in the detail panel

---

## Implementation Order Recommendation

1. **Batch 1** (Gantt + Board) — highest UX impact, builds on existing components
2. **Batch 4** (Cross-module) — high value, relatively straightforward queries
3. **Batch 2** (Locking + Baseline + Attachments) — important for governance
4. **Batch 3** (PDF + Paste + Scenarios) — advanced features, can wait

Total estimated: ~8-10 implementation rounds across all batches.

Shall I proceed with Batch 1 (Gantt enhancements + Board/Kanban view)?

