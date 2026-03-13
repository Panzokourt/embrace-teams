

# Plan: Project Overview Redesign & Deliverables/Tasks Filter Alignment

## What needs to change

### 1. Overview Tab — Card-based layout with clear sections

The current overview is a single flat card with small text listing all project info. It needs to be broken into distinct, well-styled cards with icons and larger typography.

**New layout structure (grid 7+5 like ClientDetail):**

**Left column (col-span-7):**
- **Περιγραφή Έργου** card — Description with icon header, larger text, inline edit
- **Οικονομικά Στοιχεία** card — Budget, Agency Fee, Net Budget as stat-style items with icons (like `StatKPI` pattern from `ProjectFinancialsHub`)
- **Συμβόλαια & Έγγραφα** card — Contracts + Proposals + Briefs combined or stacked cards (always visible with empty state)
- **Media Plans** card
- **Υπό-έργα** card (if any)

**Right column (col-span-5):**
- **Πελάτης & Χρονοδιάγραμμα** card — Client name (linked), start/end dates with calendar icons, due date warning badge
- **Πρόοδος & Υγεία Έργου** card — Task progress bar, deliverables progress bar, tracked hours, status badge with health indicator
- **Ομάδα Έργου** card — Team manager (already exists, just re-wrapped)

**Design details:**
- Each card gets an icon in a `h-8 w-8 rounded-lg bg-muted` box next to the title (matching existing widget pattern)
- Card titles use `text-base font-semibold` instead of `text-sm`
- Values use `text-lg font-bold` for key numbers (budget, dates)
- All cards always visible with empty states

### 2. Deliverables Tab — Filter & grouping alignment

Current `ProjectDeliverablesTable` has basic columns but needs:
- Add **Status** column (derive from `completed` boolean + a proper status field or use completed/in-progress logic based on linked tasks)
- Add grouping options matching tasks: by status, by assignee, by team
- Ensure the `TableToolbar` includes group-by dropdown and column visibility toggle (already partially there via `useTableViews`)
- Match the Monday.com-style UI from TasksTableView (colored status cells, summary rows)

### 3. Tasks Tab — Fix filters & ensure correct data

- Verify `GROUP_OPTIONS` includes `deliverable` (already added)
- Ensure deliverables data is passed correctly from `Tasks.tsx` to `TasksTableView`
- Verify the team/department column renders correctly
- Align filter/grouping UI to match deliverables table styling

## Files to modify

1. **`src/pages/ProjectDetail.tsx`** — Complete rewrite of the `overview` TabsContent section. Replace the single info card with the new multi-card grid layout. Add progress/health calculations.

2. **`src/components/projects/ProjectDeliverablesTable.tsx`** — Add status-based grouping options, add a status column (derived from completion + linked task status), align toolbar with TasksTableView patterns.

3. **`src/components/tasks/TasksTableView.tsx`** — Minor fixes to ensure deliverable and team columns render properly, verify grouping logic for deliverables works correctly.

4. **`src/pages/Tasks.tsx`** — Verify deliverables are fetched and passed to `TasksTableView` correctly when embedded in project context.

## Implementation approach

- Extract the overview into clearly separated Card components inline within `ProjectDetail.tsx`
- Use the existing `StatKPI`-like pattern (icon box + label + value) for financial data
- Use `Progress` component for task/deliverable completion bars
- Keep inline editing for budget, fee, dates, description
- For deliverables table: add `groupBy` support via existing `useTableViews` hook, add status column derived from `completed` field

