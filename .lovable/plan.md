
# Drag & Drop Έργων, Bulk Actions & Sidebar Scroll

## Επισκόπηση

Τρεις βασικές βελτιώσεις: (1) drag & drop projects σε folders στο sidebar + "Move to folder" μέσα στο project detail, (2) bulk actions στη σελίδα Projects με multi-select (Ctrl/Cmd + Shift), (3) collapsible + scrollable project tree στο sidebar.

---

## 1. Sidebar Project Tree -- Drag & Drop + Collapsible + Scroll

### Αλλαγές στο `SidebarProjectTree.tsx`:

**Drag & Drop:**
- Wrap ολόκληρο το tree σε `DndContext` (from `@dnd-kit/core`)
- Κάθε project item γίνεται draggable (`useSortable`)
- Κάθε folder γίνεται droppable (`useDroppable`)
- Η root περιοχή (χωρίς folder) είναι επίσης droppable target ("unfolder")
- On drop: update `projects.folder_id` στη βάση και invalidate queries

**Collapsible "Έργα" section:**
- Το project tree (folders + projects) τυλίγεται σε collapsible container
- Κλικ στο "Έργα" στο sidebar expand/collapse
- Αποθήκευση state σε localStorage

**Scroll με max height:**
- `max-h-[300px] overflow-y-auto` στο container
- Custom scrollbar styling (thin, subtle)
- Δείχνει μέχρι ~10-12 projects, τα υπόλοιπα με scroll

**Mutation:**
```typescript
const moveProject = useMutation({
  mutationFn: async ({ projectId, folderId }: { projectId: string; folderId: string | null }) => {
    await supabase.from('projects').update({ folder_id: folderId }).eq('id', projectId);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['sidebar-projects'] });
    toast.success('Το έργο μετακινήθηκε');
  }
});
```

---

## 2. "Move to Folder" μέσα στο Project Detail

### Αλλαγές στο `ProjectDetail.tsx`:

- Προσθήκη dropdown "Μετακίνηση σε φάκελο" στο header (δίπλα στο status)
- Fetch τους project_folders
- Select φάκελο ή "Χωρίς φάκελο"
- Update `folder_id` στη βάση
- Ίδιο dropdown και στο `ProjectInfoEditor.tsx`

---

## 3. Bulk Actions στη σελίδα Projects

### Αλλαγές στο `ProjectsTableView.tsx`:

**Multi-select:**
- Checkbox στήλη στην αρχή κάθε row
- "Select All" checkbox στο header
- Ctrl/Cmd + Click: toggle individual selection
- Shift + Click: range selection (απο τελευταίο selected ως current)
- State: `selectedIds: Set<string>`

**Bulk Actions Toolbar:**
- Εμφανίζεται πάνω από τον πίνακα όταν `selectedIds.size > 0`
- Ενέργειες:
  - **Μετακίνηση σε Φάκελο**: Dialog με select folder
  - **Αλλαγή Status**: Dialog (χρήση `BulkActionsDialog` pattern)
  - **Διαγραφή**: Confirmation dialog
- Design: Floating bar "X επιλεγμένα | [Move] [Status] [Delete]"

**Keyboard shortcuts:**
- `Ctrl/Cmd + A`: select all visible
- `Escape`: clear selection

### Νέο component: `ProjectBulkActions.tsx`
Toolbar component με τα bulk action buttons.

---

## 4. Αλλαγές στο `SidebarNavGroup` / `AppSidebar`

### "Έργα" sub-link γίνεται collapsible:
- Κλικ στο "Έργα" εναλλάσσει expand/collapse του project tree κάτω από αυτό
- Ξεχωριστό expand state για τα "Έργα" (ανεξάρτητο από το "Εργασίες" group)

---

## Αρχεία που αλλάζουν

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/components/layout/SidebarProjectTree.tsx` | DnD context, droppable folders, draggable projects, max-height scroll, collapsible |
| `src/components/projects/ProjectsTableView.tsx` | Checkbox column, multi-select logic (Ctrl/Shift), bulk actions toolbar |
| `src/components/projects/ProjectBulkActions.tsx` | **Νεο** -- Bulk actions bar (Move, Status, Delete) |
| `src/pages/ProjectDetail.tsx` | "Move to Folder" dropdown στο header |
| `src/components/layout/AppSidebar.tsx` | Minor: Κάνει το "Έργα" link collapsible toggle για το tree |

---

## Τεχνικες σημειώσεις

- Χρήση ήδη εγκατεστημένου `@dnd-kit/core` και `@dnd-kit/sortable` για drag & drop
- Η multi-select λογική (Shift range) κρατά `lastSelectedIndex` ref
- Τα bulk updates γίνονται σε batch: ένα query per action (π.χ. `.in('id', [...selectedIds])`)
- Η "Move to Folder" dialog χρησιμοποιεί τα ίδια `project_folders` data (ήδη cached)
- Scroll area: native CSS `overflow-y: auto` με thin scrollbar styling
