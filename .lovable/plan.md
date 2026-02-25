

# Project Page Refactor -- Structured Executive-First Layout

## Summary

Replace the current 7-tab flat structure (Deliverables, Tasks, Files, Media Plan, Creatives, Financials, Comments) with a 6-tab hierarchical system (Overview, Work, Planning, Finance, Assets, Activity). Add an executive Overview as the default landing tab, unify the header with a rich metadata line, and simplify the right sidebar.

---

## Current State

The page has:
- A sticky header with project name, status dropdown, folder selector, dates, and timer badge
- A 2-column layout: left (75%) with 7 tabs, right (25%) with project info card + team card
- Tabs: Deliverables, Tasks, Files, Media Plan, Creatives, Financials, Comments
- Right sidebar duplicates info already in the header (client, dates, budget)
- No overview/executive snapshot tab

---

## Changes

### 1. Unified Project Header

**File: `src/pages/ProjectDetail.tsx`**

Restructure the sticky header:
- Keep: Back button, project name, status dropdown, folder dropdown, timer badge
- Add a metadata line below the title:
  `Client Name  |  1 Jan -- 30 Jun  |  124 days left  |  EUR95,000  |  33% utilized`
- Budget utilization is calculated from invoiced amount vs total budget
- Remove duplicated info from right sidebar (client, budget, fee, dates are now in header metadata)

### 2. New Tab Structure

**File: `src/pages/ProjectDetail.tsx`**

Replace the 7 tabs with 6 primary tabs:

| Tab | Content | Source Components |
|-----|---------|-------------------|
| Overview (default) | Executive snapshot with zones A-E | New component |
| Work | Deliverables + Tasks + Gantt + Calendar with sub-nav | Existing components merged |
| Planning | Media Plan + Budget Allocation + Objectives | Existing `ProjectMediaPlan` + new sections |
| Finance | Budget + Invoices + P&L (3 sub-sections) | Simplified `ProjectFinancialsHub` |
| Assets | Creatives + Files unified with type filter | Existing components merged |
| Activity | Comments + History log in timeline | Existing `ProjectCommentsAndHistory` |

### 3. New: Overview Tab (Default Landing)

**New file: `src/components/projects/ProjectOverview.tsx`**

Structured vertical zones:

**Zone A -- Executive Snapshot (top row)**
- 6 equal-size KPI cards in a `grid-cols-3 lg:grid-cols-6` grid:
  - Total Budget
  - Budget Utilization %
  - Deliverables (completed/total)
  - Overdue Tasks
  - Invoiced / Outstanding
  - Profit Margin %
- Cards use `StatCard`-like pattern with subtle bg and consistent sizing

**Zone B -- Project Scope**
- Card with project description
- Bullet summary of deliverables
- Linked briefs (from `project_briefs` if available)
- Always visible

**Zone C -- 3-Column Grid** (`grid-cols-1 md:grid-cols-3`)
- Column 1: Deliverables list with status indicator, budget per deliverable, % completion
- Column 2: Team -- Project Lead, Account Manager, Members with role tags
- Column 3: Timeline snapshot -- start/end dates, days remaining, up to 3 upcoming milestones

**Zone D -- Budget Breakdown**
- 2 charts only: Budget by Deliverable (bar chart) + Budget by Department/Service (pie chart)
- Uses Recharts, consistent with dashboard chart styling

**Zone E -- Quick Actions**
- Horizontal row of minimal buttons: View Work, View Planning, View Finance, View Assets, Open Activity
- Clicking each switches to the corresponding tab

### 4. Work Tab (Merged Delivery Layer)

**New file: `src/components/projects/ProjectWorkTab.tsx`**

Sub-navigation inside the Work tab:
- List View (default) -- Deliverables table with expandable task rows (existing `ProjectDeliverablesTable`)
- Kanban -- Tasks in kanban view (reuse existing Tasks page kanban mode)
- Gantt -- Existing `ProjectGanttView`
- Calendar -- Calendar view of tasks/milestones

Sub-nav rendered as small toggle buttons (not nested tabs) to avoid tab-in-tab confusion.

### 5. Planning Tab

**New file: `src/components/projects/ProjectPlanningTab.tsx`**

3 sections stacked vertically:
- Section 1: Objectives (text/bullet list, editable)
- Section 2: Media Plan (existing `ProjectMediaPlan` component)
- Section 3: Budget Allocation summary (simple table showing allocation per deliverable/category)

### 6. Finance Tab (Simplified)

**File: `src/components/projects/ProjectFinancialsHub.tsx`**

Simplify to exactly 3 sub-sections (keep as internal sub-tabs):
1. Budget: Total Budget, Agency Fee, Net Budget, Utilization bar
2. Invoices: Invoiced, Collected, Outstanding, Invoice list
3. P&L: Revenue, Expenses, Profit, Margin

Remove excessive KPI repetition from the current 8-card layout. Keep max 4 summary KPIs at top, then the detail section.

### 7. Assets Tab (Unified)

**New file: `src/components/projects/ProjectAssetsTab.tsx`**

Merge Creatives + Files into one view:
- Type filter tabs/chips: All, Creatives, Documents, Contracts, Presentations
- Card/grid view (reuse `ProjectCreatives` gallery mode and `FileExplorer`)
- Search bar at top

### 8. Activity Tab

Reuse existing `ProjectCommentsAndHistory` component with minor styling adjustments:
- Timeline layout with chronological order
- Include comments, status changes, budget changes, file uploads
- Clean spacing

### 9. Right Sidebar (Simplified)

**File: `src/pages/ProjectDetail.tsx`**

Make sidebar collapsible (toggle button). Content reduced to:
- Section 1: Core Info only -- Client, Budget, Agency Fee, Dates (inline editable, as currently)
- Section 2: Team Quick View (existing `ProjectTeamManager` compact mode)
- Remove: description (moved to Overview), tracked hours (in header), tasks/deliverables counts (in Overview KPIs)

---

## Files Summary

| Action | File |
|--------|------|
| Create | `src/components/projects/ProjectOverview.tsx` |
| Create | `src/components/projects/ProjectWorkTab.tsx` |
| Create | `src/components/projects/ProjectPlanningTab.tsx` |
| Create | `src/components/projects/ProjectAssetsTab.tsx` |
| Major Edit | `src/pages/ProjectDetail.tsx` (new tab structure, header, sidebar) |
| Edit | `src/components/projects/ProjectFinancialsHub.tsx` (simplify to 3 sections) |

Existing components (`ProjectDeliverablesTable`, `ProjectGanttView`, `ProjectMediaPlan`, `ProjectCreatives`, `FileExplorer`, `ProjectCommentsAndHistory`, `ProjectTeamManager`) are reused as-is inside the new tab wrappers -- no breaking changes to those components.

