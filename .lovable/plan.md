
# Auto-Organization of Projects by Category & Client

## Overview

The sidebar project tree will support an **auto-organize mode** that automatically creates a virtual folder hierarchy: **Category (Sector) > Client > Projects**. Users can also define custom categories in Settings that will be used as the top-level grouping.

---

## 1. Database: Custom Project Categories

### New table: `project_categories`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| company_id | uuid FK | |
| name | text | Category name (e.g. "Δημόσιος Τομέας") |
| color | text, nullable | Color for folder icon |
| sort_order | integer, default 0 | Display order |
| created_at | timestamptz | |

RLS:
- SELECT: active users in same company
- ALL: admin/manager in same company

### Seed default categories
On first load (client-side), if no categories exist, the app will offer to create defaults based on the existing sector options (Δημόσιος Τομέας, Ιδιωτικός Τομέας, ΜΚΟ, Startup, Πολυεθνική).

---

## 2. Settings: Category Manager

### New card in Settings page (Admin only): "Κατηγορίες Έργων"

- List of current categories with drag-to-reorder
- Inline rename (click to edit)
- Delete button (with confirmation)
- "Add Category" button at bottom
- Color picker per category (optional)
- Explanation text: "Οι κατηγορίες χρησιμοποιούνται για την αυτόματη οργάνωση των έργων στο sidebar."

---

## 3. Sidebar Project Tree: Auto-Organize Mode

### Updated `SidebarProjectTree.tsx`

The tree will now support **two modes** (toggle button at top):
1. **Manual mode** (current): User-created folders with drag & drop
2. **Auto mode** (new default): Virtual hierarchy based on categories and clients

### Auto mode structure:

```text
v Δημόσιος Τομέας
    v ΕΔΥΤΕ
        EDYTE Platform
        EDYTE SEO
    v Υπ. Παιδείας
        Ministry Rebranding
v Ιδιωτικός Τομέας
    v Alpha Bank
        Alpha Bank App Launch
    v Cosmote
        Cosmote Rebranding
        Cosmote SEO
v Χωρίς Κατηγορία
    v Vodafone
        Vodafone Social Media 2026
    Orphan Project (no client)
```

### Logic:
1. Fetch `project_categories` for the company
2. Fetch `projects` with `client:clients(name, sector)` join
3. Group projects: category (from client.sector mapped to project_categories.name) > client > projects
4. Projects without a client go under "Χωρίς Κατηγορία" at root level
5. Clients whose sector doesn't match any category go under "Χωρίς Κατηγορία"

### Toggle button:
- Small icon button at top of tree: switch between auto/manual
- Preference saved in localStorage (`sidebar-project-tree-mode`)

---

## 4. Mapping: Client Sector to Category

The mapping works by matching `clients.sector` value to `project_categories.name`:
- `public` -> looks for category named "Δημόσιος Τομέας"
- `private` -> "Ιδιωτικός Τομέας"
- etc.

A fallback mapping table will be used for the default sector values. For custom categories, the match is by name.

If the admin adds a new category (e.g. "Ευρωπαϊκά Προγράμματα"), they can then set that sector value on clients, and projects will automatically appear under that category in the sidebar.

---

## Files to Create / Modify

| File | Change |
|------|--------|
| **Migration SQL** | Create `project_categories` table with RLS |
| `src/components/layout/SidebarProjectTree.tsx` | Add auto-organize mode with category > client > project hierarchy, toggle button |
| `src/pages/Settings.tsx` | Add "Κατηγορίες Έργων" card for managing categories |
| `src/components/clients/ClientForm.tsx` | Update sector options to pull from `project_categories` dynamically |
| `src/pages/Clients.tsx` | Same: dynamic sector options |

---

## Technical Notes

- The auto-organize mode is purely a **view layer** -- it does not modify `folder_id` on projects. It creates a virtual grouping based on client.sector matching categories.
- Manual folders (`project_folders`) remain available in manual mode and for bulk actions.
- The sidebar query in auto mode fetches: `projects(id, name, status, client_id, client:clients(id, name, sector))` -- a single query with join.
- Categories are company-scoped so each organization can define their own structure.
- The toggle between modes is instant (no data refetch needed, just different rendering logic).
