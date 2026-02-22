

# Project Detail Page Restructuring

## Summary

Reorganize the Project Detail page for better structure: move tabs above KPI cards, consolidate content, add expandable deliverables with linked tasks, show total tracked time, and fix sidebar folder persistence.

---

## Changes

### 1. Move Tabs Above Cards, Cards Only in Overview (`src/pages/ProjectDetail.tsx`)

- Move the `<Tabs>` component to wrap **everything** below the header (including the KPI cards)
- Move the 3 KPI cards (Budget, Progress, Due Date) **inside** the Overview `TabsContent`
- Remove the `timeline` tab and its `TabsContent` entirely
- Remove the `comments` tab trigger
- Add `<ProjectCommentsAndHistory>` at the bottom of the Overview tab content
- Add total tracked time display in the header area (top-right)
- Fetch total time from `time_entries` table filtered by `project_id`
- Make KPI cards responsive: `grid-cols-1 sm:grid-cols-3` so they stack on narrow screens

### 2. Remove Timeline Tab (`src/pages/ProjectDetail.tsx`)

- Remove the `GanttChartSquare` import
- Remove `TabsTrigger value="timeline"` and its `TabsContent`
- Remove `ProjectGanttView` import

### 3. Comments Merged into Overview (`src/pages/ProjectDetail.tsx`)

- Remove `TabsTrigger value="comments"` 
- Add a section at the bottom of the Overview tab with a heading "Σχόλια & Ιστορικό" followed by `<ProjectCommentsAndHistory projectId={project.id} />`

### 4. Expandable Deliverables with Tasks (`src/components/projects/ProjectDeliverablesTable.tsx`)

- Add an expandable row feature: clicking a deliverable row expands it to show tasks/subtasks linked to that deliverable
- Fetch tasks with `deliverable_id` matching each deliverable
- Display expanded tasks in a nested, indented sub-table or card list below the deliverable row
- Use `Collapsible` component for smooth open/close animation
- Make the expanded area responsive (stacks on narrow screens)

### 5. Total Tracked Time in Header (`src/pages/ProjectDetail.tsx`)

- Add a query to fetch `SUM(duration_minutes)` from `time_entries` where `project_id = id`
- Display formatted hours (e.g., "42.5h") in the header area, top-right, with a Clock icon
- Use a small Badge or inline text element

### 6. Sidebar Folder Persistence (`src/components/layout/SidebarProjectTree.tsx`)

- When navigating to a project inside a folder, auto-expand the parent folder(s)
- In the `useEffect` or render logic, detect `currentProjectId` and find which folder it belongs to
- Add that folder's ID to `expandedFolders` set automatically
- This applies to both manual and auto modes (VirtualFolder needs state lift)

### 7. Auto-Expand in Auto Mode (`src/components/layout/SidebarProjectTree.tsx`)

- The `VirtualFolder` component currently manages its own `open` state internally
- Refactor to accept an `open` prop or use a shared expanded state
- When `currentProjectId` matches a project inside a category > client hierarchy, auto-expand those virtual folders
- Store expanded virtual folder keys in a Set managed by the parent `SidebarProjectTree`

### 8. Responsive Polish (`src/pages/ProjectDetail.tsx`)

- KPI cards: `grid-cols-1 sm:grid-cols-3` (stack on mobile)
- Overview grid rows: already `lg:grid-cols-3`, keep as-is
- Tabs list: already `flex-wrap`, ensure it stays clean
- All cards maintain equal sizing within their grid

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/ProjectDetail.tsx` | Restructure: tabs above cards, cards in overview only, remove timeline/comments tabs, add comments to overview, add total time display, responsive grid |
| `src/components/projects/ProjectDeliverablesTable.tsx` | Add expandable rows showing linked tasks per deliverable |
| `src/components/layout/SidebarProjectTree.tsx` | Auto-expand folders containing the active project in both manual and auto modes |

---

## Technical Notes

- Total tracked time query: `supabase.from('time_entries').select('duration_minutes').eq('project_id', id).eq('is_running', false)` then sum client-side
- Deliverable-task linking uses the existing `deliverable_id` column on the `tasks` table
- VirtualFolder auto-expand requires lifting open state to parent and computing which folders contain the active project
- No new dependencies needed

