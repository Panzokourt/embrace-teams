
## Αναβαθμιση Πινακων σε Project Detail

### Τρεχουσα Κατασταση
- **Tender Detail**: Ηδη χρησιμοποιει enhanced tables (`TenderDeliverablesTable`, `TenderTasksTable`) με inline editing, sorting, resizable columns, toolbar, CSV/Excel export
- **Project Detail**: Χρησιμοποιει παλια card/list components (`ProjectDeliverables`, `ProjectTasksManager`) χωρις τις παραπανω δυνατοτητες

### Αλλαγες

#### 1. Νεο αρχειο: `src/components/projects/ProjectDeliverablesTable.tsx`
Δημιουργια enhanced table για τα Παραδοτεα του Project, ακολουθωντας το pattern του `TenderDeliverablesTable`:
- Στηλες: Checkbox, Ονομα, Περιγραφη, Budget, Κοστος, Προθεσμια, Ολοκληρωθηκε, Ενεργειες
- Inline editing μεσω `EnhancedInlineEditCell`
- Sorting, column resizing, column visibility toggle
- Toolbar με εξαγωγη CSV/Excel
- Progress bar και budget summary
- Dialog για δημιουργια/επεξεργασια

#### 2. Νεο αρχειο: `src/components/projects/ProjectTasksTable.tsx`
Δημιουργια enhanced table για τα Tasks του Project, ακολουθωντας το pattern του `TenderTasksTable`:
- Στηλες: Checkbox, Τιτλος, Υπευθυνος, Παραδοτεο, Προθεσμια, Κατασταση, Ενεργειες
- Inline editing μεσω `EnhancedInlineEditCell`
- Sorting, column resizing, column visibility toggle
- Toolbar με εξαγωγη CSV/Excel
- Dialog για δημιουργια/επεξεργασια

#### 3. Τροποποιηση: `src/pages/ProjectDetail.tsx`
- Αντικατασταση `ProjectDeliverables` με `ProjectDeliverablesTable`
- Αντικατασταση `ProjectTasksManager` με `ProjectTasksTable`
- Αφαιρεση των Card wrappers (τα νεα components ειναι αυτονομα)

### Τεχνικες Λεπτομερειες
- Τα νεα components χρησιμοποιουν τα ιδια shared components: `EnhancedInlineEditCell`, `TableToolbar`, `ResizableTableHeader`, `useTableViews`
- Τα παλια αρχεια (`ProjectDeliverables.tsx`, `ProjectTasksManager.tsx`) παραμενουν στο project αλλα δεν χρησιμοποιουνται πλεον - μπορουν να αφαιρεθουν αργοτερα
- Δεν απαιτουνται αλλαγες στη βαση δεδομενων - χρησιμοποιουνται οι ιδιοι πινακες `deliverables` και `tasks`
- Storage keys: `project_deliverables_table` και `project_tasks_table` για αποθηκευση column widths/visibility
