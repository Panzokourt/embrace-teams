

# Plan: Fix Empty State + Add View Tabs & Filters to Files

## Issue 1: Empty Folder When No Folders Exist

**Root cause**: `FinderColumnView.getColumnItems(null)` correctly looks for files with `folder_id === null`, but if all files have a `folder_id` set (or there are simply no files), it shows "Κενός φάκελος". The real issue is likely that files uploaded to projects have `project_id` set but the central explorer doesn't show them at root level.

**Fix**: In the root column (`parentId === null`), if there are no folders at all, show ALL files regardless of `folder_id` so the user sees content immediately.

## Issue 2: View Tabs + Filters

Re-add the view toggle tabs from the screenshot (Όλα τα Αρχεία, Κατά Πελάτη, Κατά Έργο, Χρονολογικά) using the existing `unified-view-toggle` UI pattern but as filter modes. Add type/date filters.

### Changes

| File | Change |
|---|---|
| `src/components/files/FinderColumnView.tsx` | Fix `getColumnItems`: when root has no subfolders, show all files. Also accept an optional `groupedMode` prop for grouped views. |
| `src/components/files/CentralFileExplorer.tsx` | Add view tabs (Όλα, Κατά Πελάτη, Κατά Έργο, Χρονολογικά) above the Finder view. Add filter dropdowns (file type, date range). In grouped modes, organize files into virtual folder groups by client/project/date before passing to FinderColumnView. |
| `src/components/files/FileExplorer.tsx` | Same empty-state fix applies (show files even without folders). |

### Behavior per view tab
- **Όλα τα Αρχεία**: Current Finder column view (flat folders + files)
- **Κατά Πελάτη**: Root column shows client names as virtual folders; drilling in shows that client's files
- **Κατά Έργο**: Root column shows project names as virtual folders
- **Χρονολογικά**: Root column shows month groups (e.g. "Μάρτιος 2026", "Φεβρουάριος 2026")

### Filter bar
- File type dropdown (Images, Documents, Videos, Audio, All)
- Search (already exists, keep it)
- Compact pill-style tab selector for views

