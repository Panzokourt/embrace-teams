

# Plan: Natural/Numeric Sorting Across the App

## Problem
All text-based sorting uses plain `localeCompare()` which sorts character-by-character, making "Π10" come before "Π2". The fix is simple: JavaScript's `localeCompare` natively supports numeric sorting via the `{ numeric: true }` option.

## Solution

### 1. Add a `naturalCompare` utility to `src/lib/utils.ts`
```ts
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, 'el', { numeric: true, sensitivity: 'base' });
}
```

### 2. Replace all `localeCompare` calls across the codebase (~10 files, ~20 occurrences)
Replace `.localeCompare(...)` with `naturalCompare(...)` (or add `{ numeric: true }` option) in:

- `src/components/files/FinderColumnView.tsx` — folder/file name sorting
- `src/components/files/FilesTableView.tsx` — file name, content type, folder sorting
- `src/components/files/CentralFileExplorer.tsx` — month groups
- `src/components/layout/SidebarProjectTree.tsx` — categories, client names (the deliverables list in sidebar)
- `src/components/org-chart/OrgListView.tsx` — name, title, department
- `src/components/pricing/PricingDashboard.tsx` — months
- `src/pages/Projects.tsx` — client name sorting
- `src/pages/Clients.tsx` — client name sorting
- `src/pages/Tenders.tsx` — client name sorting
- `src/pages/TenderDetail.tsx` — client name sorting
- `src/components/projects/ProjectsTableView.tsx` — project sorting
- `src/components/tenders/TendersTableView.tsx` — tender sorting
- `src/components/tenders/TenderDeliverablesTable.tsx` — deliverable sorting

### 3. Fix `.sort()` on string arrays
Instances like `[...titles].sort()` become `[...titles].sort(naturalCompare)`.

This is a mechanical find-and-replace with the new utility function. No logic changes, no UI changes — just correct numeric-aware ordering everywhere.

