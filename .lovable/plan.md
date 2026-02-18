
# Executive Dashboard - Customizable Cards & Filters

## Τι αλλάζει

### 1. Customizable Dashboard Cards
Κάθε card/widget στο dashboard γίνεται configurable:
- Ο χρήστης μπορεί να **προσθέσει/αφαιρέσει** cards μέσω ενός "Customize" button στο header
- Κάθε card μπορεί να αλλάξει **μέγεθος** (small/medium/large) που αντιστοιχεί σε grid column spans (1, 2, 3 cols)
- Η διαμόρφωση αποθηκεύεται σε `localStorage` ωστε να διατηρείται μεταξύ sessions

### 2. Dashboard Filters
Στο header του dashboard προστίθεται toolbar με:
- **Χρονικό φίλτρο**: Σήμερα, Εβδομάδα, Μήνας, Τρίμηνο, Ετος
- **Φίλτρο Πελάτη**: Dropdown με τους πελάτες
- **Φίλτρο Έργου**: Dropdown με τα ενεργά έργα

Τα φίλτρα εφαρμόζονται στα data queries (tasks, invoices, expenses, time entries).

### 3. Νέα widgets
Πέρα από τα υπάρχοντα, προστίθενται:
- **Recent Activity**: Τελευταίες ενέργειες από το activity_log
- **Revenue Chart**: Mini γράφημα εσόδων (recharts, ήδη installed)
- **Project Progress**: Επισκόπηση προόδου ενεργών έργων (progress bar per project)

### 4. Widget Registry
Ορίζεται ένα registry με ολα τα διαθέσιμα widgets:

```text
ID                  | Τίτλος              | Default Size | Default Visible
--------------------|----------------------|--------------|----------------
total_revenue       | Συνολικά Έσοδα       | small        | yes
agency_fee          | Προμήθεια Agency     | small        | yes
net_profit          | Καθαρό Κέρδος        | small        | yes
pending_invoices    | Εκκρεμή Τιμολόγια    | small        | yes
active_tenders      | Διαγωνισμοί          | small        | yes
active_projects     | Ενεργά Έργα          | small        | yes
win_rate            | Win Rate             | small        | yes
overdue             | Overdue Tasks        | small        | yes
today_hours         | Ώρες Σήμερα          | small        | yes
utilization         | Utilization          | small        | yes
pipeline            | Pipeline             | large        | yes
alerts              | Alerts               | medium       | yes
deadlines           | Deadlines            | medium       | yes
recent_activity     | Πρόσφατη Δραστηριότητα| medium      | yes
revenue_chart       | Γράφημα Εσόδων       | large        | no
project_progress    | Πρόοδος Έργων        | medium       | no
```

## Αρχιτεκτονική

### Νέα αρχεία
- `src/components/dashboard/DashboardCustomizer.tsx` - Dialog για add/remove widgets και αλλαγή μεγέθους
- `src/components/dashboard/DashboardFilters.tsx` - Toolbar με χρονικά/πελάτη/έργο φίλτρα
- `src/components/dashboard/widgetRegistry.ts` - Registry ορισμού widgets (id, label, defaultSize, component ref)
- `src/components/dashboard/widgets/RecentActivity.tsx` - Widget πρόσφατης δραστηριότητας
- `src/components/dashboard/widgets/RevenueChart.tsx` - Mini revenue chart
- `src/components/dashboard/widgets/ProjectProgress.tsx` - Progress bars ενεργών έργων
- `src/hooks/useDashboardConfig.ts` - Hook για localStorage persistence της dashboard config

### Αλλαγές σε υπάρχοντα
- `src/pages/Dashboard.tsx` - Refactor για widget-based rendering, filters state, customizer integration

## Technical Details

### Dashboard Config (localStorage)
```text
{
  widgets: [
    { id: "total_revenue", visible: true, size: "small" },
    { id: "pipeline", visible: true, size: "large" },
    ...
  ],
  filters: {
    period: "month",
    clientId: null,
    projectId: null
  }
}
```

### Widget Sizing
- **small**: `col-span-1` (1/4 σε desktop)
- **medium**: `col-span-2` (2/4 σε desktop)
- **large**: `col-span-4` (full width)

Το grid είναι `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` οπότε τα sizes αντιστοιχούν ομαλά.

### Customizer UI
- Gear icon button στο dashboard header
- Ανοίγει Sheet (sidebar panel) με checklist ολων των widgets
- Κάθε widget έχει toggle visibility + size selector (S/M/L buttons)
- Drag handles ΔΕΝ χρειάζονται (τα widgets κάνουν auto-flow στο grid)

### Filters Logic
- Τα φίλτρα εφαρμόζονται στα Supabase queries:
  - **Period**: `.gte('created_at', startDate)` ή `.gte('due_date', startDate)` ανά πίνακα
  - **Client**: `.eq('client_id', clientId)` στα invoices/projects
  - **Project**: `.eq('project_id', projectId)` στα tasks/expenses
- Τα financial stats (revenue, expenses) φιλτράρονται χρονικά
- Τα task stats φιλτράρονται ανά έργο/πελάτη

### Σειρά υλοποίησης
1. `useDashboardConfig` hook (config persistence)
2. `widgetRegistry.ts` (widget definitions)
3. `DashboardFilters.tsx` (filter toolbar)
4. `DashboardCustomizer.tsx` (add/remove/resize UI)
5. New widget components (RecentActivity, RevenueChart, ProjectProgress)
6. Refactor `Dashboard.tsx` (integrate all above)
