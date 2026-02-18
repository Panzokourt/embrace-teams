
# Dashboard Enhancement - Per-widget Settings, Drag & Drop, Export, Saved Layouts

## Τι αλλάζει

### 1. Gear icon σε κάθε widget card
Κάθε widget αποκτά ένα μικρό gear icon (top-right, εμφανίζεται στο hover) που ανοίγει inline popover με:
- **Αλλαγή μεγέθους** (S/M/L)
- **Απόκρυψη** widget
- Για composite widgets: **Εναλλαγή view type** (card/table/list) οπου εφαρμόζεται

Ένα νέο `WidgetWrapper` component τυλίγει κάθε widget και παρέχει αυτά τα controls.

### 2. Drag & Drop αναδιάταξη widgets
Χρήση του ήδη εγκατεστημένου `@dnd-kit/sortable` (υπάρχει στο project) για drag-and-drop:
- Κάθε widget γίνεται sortable μέσα στο grid
- Η σειρά αποθηκεύεται στο config (localStorage)
- Drag handle εμφανίζεται στο hover δίπλα στο gear icon

Αλλαγές στο `useDashboardConfig`:
- Το `widgets` array γίνεται ordered (η σειρά στο array = η σειρά στο grid)
- Προστίθεται `reorderWidgets(activeId, overId)` function

### 3. Εξαγωγή Dashboard
Προστίθεται export button στο header δίπλα στο gear icon, με dropdown:
- **PDF**: `window.print()` με print-optimized styles
- **PNG/Screenshot**: Χρήση html2canvas-like approach μέσω CSS print
- **Excel**: Export ολων των visible stat values σε πίνακα

Νέο component `DashboardExport.tsx` με dropdown menu.

### 4. Αποθήκευση πολλαπλών Dashboard layouts
Ο χρήστης μπορεί να:
- **Αποθηκεύσει** το τρέχον layout με όνομα (π.χ. "Financial Overview", "Project Focus")
- **Φορτώσει** αποθηκευμένο layout από dropdown menu
- **Διαγράψει** αποθηκευμένα layouts
- Υπάρχει πάντα ένα "Default" layout

Αποθήκευση σε localStorage με key `dashboard_saved_layouts_v1`.

Νέο component `DashboardLayoutSelector.tsx` - dropdown στο header.

## Technical Details

### Νέα αρχεία
- `src/components/dashboard/WidgetWrapper.tsx` - Wrapper με gear menu, drag handle, view toggle
- `src/components/dashboard/DashboardExport.tsx` - Export dropdown (PDF/Excel)
- `src/components/dashboard/DashboardLayoutSelector.tsx` - Saved layouts dropdown

### Αλλαγές σε υπάρχοντα

**`src/hooks/useDashboardConfig.ts`**:
- Προσθήκη `reorderWidgets(activeId, overId)` για drag reorder
- Προσθήκη `savedLayouts` management: `saveLayout(name)`, `loadLayout(name)`, `deleteLayout(name)`, `getSavedLayouts()`
- Αποθήκευση view type per widget: `viewType?: 'card' | 'table' | 'list'`
- Νέο storage key `dashboard_saved_layouts_v1` για τα saved layouts

**`src/pages/Dashboard.tsx`**:
- Wrap widget grid σε `DndContext` + `SortableContext` από @dnd-kit
- Wrap κάθε widget σε `WidgetWrapper`
- Προσθήκη `DashboardExport` και `DashboardLayoutSelector` στο header
- Composite widgets (deadlines, recent_activity, pipeline) θα λαμβάνουν `viewType` prop για εναλλαγή card/table

**`src/components/dashboard/widgetRegistry.ts`**:
- Προσθήκη `supportedViews?: ('card' | 'table' | 'list')[]` στο `WidgetDefinition`
- Composite widgets θα δηλώνουν ποια views υποστηρίζουν

### WidgetWrapper component
```text
+--------------------------------------------+
|  [drag handle]            [gear icon]       |
|                                             |
|   < actual widget content >                 |
|                                             |
+--------------------------------------------+

Gear popover:
- Size: [S] [M] [L]
- View: [Card] [Table] (αν υποστηρίζεται)
- [Απόκρυψη]
```

### Drag & Drop implementation
- `DndContext` + `SortableContext` wrap το grid
- Κάθε widget χρησιμοποιεί `useSortable` μέσω `WidgetWrapper`
- Στο `onDragEnd`: ανταλλαγή θέσεων στο widgets array via `arrayMove`
- Η νέα σειρά αποθηκεύεται αυτόματα στο localStorage

### Saved Layouts storage
```text
localStorage key: dashboard_saved_layouts_v1
{
  "Financial Overview": { widgets: [...], filters: {...} },
  "Project Focus": { widgets: [...], filters: {...} },
  ...
}
```

### Export
- **PDF**: Capture visible dashboard area via `window.print()` με `@media print` CSS
- **Excel**: Collect visible stat widget values + labels σε table format, χρήση υπάρχοντος `exportToExcel`

### Σειρά υλοποίησης
1. Επέκταση `useDashboardConfig` (reorder, viewType, saved layouts)
2. Επέκταση `widgetRegistry.ts` (supportedViews)
3. `WidgetWrapper.tsx` (gear menu + drag handle)
4. `DashboardExport.tsx` (export dropdown)
5. `DashboardLayoutSelector.tsx` (saved layouts UI)
6. Refactor `Dashboard.tsx` (DndContext, wrappers, header components)
