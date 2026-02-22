

# UI Fixes: Work Section, Sidebar & Project Tasks

## Overview
Five targeted fixes addressing navigation, settings, and UI consistency issues.

---

## 1. Remove Tabs from Work Page -- Use Route-Based Sub-Pages

**Problem:** The `/work` page uses a `Tabs` component, showing tabs (Erga, Tasks, Imeroologio) inline. They should be separate sub-pages navigated via the sidebar only.

**Fix:**
- Replace the `Tabs` component in `src/pages/Work.tsx` with a simple router that reads the `tab` query param and renders the correct page component directly (no tab bar UI).
- The `TabsList` will be completely removed -- navigation happens only via sidebar sub-links.

**File:** `src/pages/Work.tsx`

---

## 2. Fix Sidebar Sub-Page Navigation

**Problem:** Clicking "Tasks" or "Imeroologio" in the sidebar doesn't change the page content.

**Root Cause:** The sidebar links navigate to `/work?tab=tasks` etc., but the `Work.tsx` component reads the `tab` from `useSearchParams` only at initial render via `useState`. Subsequent URL changes don't update `activeTab`.

**Fix:** In `src/pages/Work.tsx`, derive the active tab directly from `searchParams` instead of using local `useState`. Since we're removing the TabsList (fix 1), the component will simply read `searchParams.get('tab')` and render the corresponding page.

**File:** `src/pages/Work.tsx`

---

## 3. Move "Auto/Manual Organization" Toggle to Settings

**Problem:** The auto/manual project tree mode toggle button is in the sidebar's project tree. User wants it in Settings.

**Fix:**
- Remove the mode toggle buttons (LayoutGrid / FolderTree icons) from `SidebarProjectTree.tsx`.
- Read the mode from `localStorage` only (no toggle in sidebar).
- Add a new setting card in `src/pages/Settings.tsx` under the Appearance section with a radio/button group to choose between "Automatic Organization" and "Manual Folders".
- The setting saves to `localStorage` key `sidebar-project-tree-mode`.

**Files:** `src/components/layout/SidebarProjectTree.tsx`, `src/pages/Settings.tsx`

---

## 4. Match Project Tasks Tab to Global Tasks Page

**Problem:** Tasks inside a project (ProjectDetail > Tasks tab) use `ProjectTasksTable` which has a different, simpler appearance than the global `TasksTableView` used on the `/work?tab=tasks` page.

**Fix:**
- Replace `ProjectTasksTable` usage in `ProjectDetail.tsx` Tasks tab with the full `TasksTableView` component, passing `projectId` as a filter prop.
- Update `TasksTableView` to accept an optional `projectId` prop that pre-filters tasks to that project (hiding the project column when filtered).

**Files:** `src/pages/ProjectDetail.tsx`, `src/components/tasks/TasksTableView.tsx`

---

## 5. Folders Closed by Default in Sidebar Project Tree

**Problem:** Virtual folders in auto mode start open (`defaultOpen = true`).

**Fix:**
- Change `VirtualFolder` default from `defaultOpen = true` to `defaultOpen = false`.

**File:** `src/components/layout/SidebarProjectTree.tsx`

---

## Implementation Order

| Step | Change | File(s) |
|------|--------|---------|
| 1 | Remove tabs UI from Work page, use query param routing | `Work.tsx` |
| 2 | (Covered by step 1) | `Work.tsx` |
| 3 | Remove toggle from sidebar, add to Settings | `SidebarProjectTree.tsx`, `Settings.tsx` |
| 4 | Use TasksTableView in ProjectDetail with projectId filter | `ProjectDetail.tsx`, `TasksTableView.tsx` |
| 5 | Set defaultOpen=false for VirtualFolder | `SidebarProjectTree.tsx` |

