

# Plan: Fix My Work Navigation + Finder-style Files UI

## Issue 1: My Work Sidebar Bug

**Root cause**: In `AppSidebar.tsx` line 126, the `detectCategory` function maps `/my-work` to `'overview'` instead of `'work'`:

```
if (pathname === '/my-work' || pathname === '/' || ...) return 'overview';
```

Since `/my-work` is listed under the Work category in the sidebar (line 451), navigating there causes the detected category to flip to Overview, making the sidebar switch away from the Work section.

**Fix**: Move `/my-work` out of the overview check in `detectCategory`. The work check on line 118 already handles paths starting with `/work` but not `/my-work`. Add `/my-work` to the work category detection.

**Files**: `src/components/layout/AppSidebar.tsx` — 2-line change in `detectCategory` and `categories` route prefixes.

---

## Issue 2: Finder-style Files UI

The user wants a macOS Finder "column view" experience — multiple columns side by side, each showing the contents of the selected folder, drilling deeper as you navigate. Clean, not chaotic.

### Design

**Layout**: A horizontal multi-column browser (like Finder's column view):
- Each column shows the contents of a folder level
- Clicking a folder opens a new column to the right showing its children
- Clicking a file shows a preview/info panel on the right
- Breadcrumb path bar at the top
- Search bar integrated in the toolbar
- Upload button in toolbar

**Column structure**:
```text
┌─────────────┬──────────────┬──────────────┬─────────────────┐
│ Root        │ Subfolder    │ Contents     │ Preview Panel   │
│             │              │              │                 │
│ 📁 Clients  │ 📁 Reports   │ 📄 file.pdf  │ file.pdf        │
│ 📁 Projects │ 📁 Invoices  │ 📄 doc.docx  │ PDF - 198 KB    │
│ 📁 HR       │              │ 📁 Archive   │ Created: ...    │
│             │              │              │ By: ...         │
└─────────────┴──────────────┴──────────────┴─────────────────┘
```

Each column:
- Shows folders first (with folder icon + chevron), then files
- Selected item is highlighted
- Scrollable independently
- Consistent width (~200px per column)

Preview panel (rightmost):
- File thumbnail/icon
- File name, size, type
- Upload date, uploader
- Download / Preview / Delete actions

### Components

| File | Change |
|---|---|
| `src/components/layout/AppSidebar.tsx` | Fix `detectCategory` to map `/my-work` → `'work'`; add `/my-work` to work category routePrefixes |
| `src/components/files/FinderColumnView.tsx` | **New** — Finder-style column browser component with multi-column navigation, file preview panel |
| `src/components/files/CentralFileExplorer.tsx` | **Rewrite** — Replace tabs/table layout with FinderColumnView. Keep filter bar (search, client, project filters) but simplify. Remove the by-client/by-project/by-date tab views in favor of the column navigation. |
| `src/components/files/FileExplorer.tsx` | **Update** — Use FinderColumnView instead of FolderTree + FilesTableView side-by-side for the project-scoped file tab |

### Key behaviors
- Columns auto-scroll horizontally when drilling deep (like Finder)
- Upload via toolbar button or drag-and-drop onto a column
- Right-click context menu on files/folders for rename, delete, move
- Folder creation via "+" button in each column header
- All existing CRUD operations (upload, delete, rename, move) preserved — just new UI shell

