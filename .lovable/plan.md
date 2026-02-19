

# Reports Section -- Κεντρικό Hub Αναφορών

## Επισκόπηση

Νέο ανεξάρτητο section "Αναφορές" (`/reports`) στο sidebar, με πλήρες σύστημα reporting που καλύπτει όλους τους τομείς της εφαρμογής. Ο χρήστης θα μπορεί να βλέπει live dashboards και να εξάγει αναφορές σε PDF, Excel και CSV.

## Δομή Tabs

| Tab | Περιεχόμενο |
|-----|-------------|
| **Επισκόπηση** | Executive summary με KPIs, γραφήματα τάσεων, top-level μετρικές |
| **Οικονομικά** | P&L ανά πελάτη/έργο/μήνα, aging analysis, revenue trends, expense breakdown |
| **Έργα** | Project status breakdown, progress tracking, budget vs actual, timeline adherence |
| **Πελάτες** | Revenue ανά πελάτη, project count, profitability ranking |
| **Ομάδα** | Task completion rates, workload distribution, time tracking summaries |

## Features

- **Global Filters**: Περίοδος (3/6/12 μήνες, custom range), Πελάτης, Έργο
- **Live Dashboards**: Recharts γραφήματα (Area, Bar, Pie, Line) σε κάθε tab
- **Export σε πολλαπλά formats**:
  - **Excel** (.xls) -- μέσω του υπάρχοντος `exportToExcel`
  - **CSV** -- μέσω του υπάρχοντος `exportToCSV`
  - **PDF** -- μέσω `window.print()` με print-optimized CSS
- **Saved Reports**: Δυνατότητα αποθήκευσης report configurations στο localStorage
- **Responsive**: Πλήρης υποστήριξη mobile/tablet

## Τεχνικές Αλλαγές

### Νέα Αρχεία

| Αρχείο | Περιγραφή |
|--------|-----------|
| `src/pages/Reports.tsx` | Ανανεωμένη κεντρική σελίδα -- wrapper με tabs, global filters, export menu |
| `src/components/reports/ReportsOverview.tsx` | Tab: Executive summary KPIs & trends |
| `src/components/reports/ReportsFinancial.tsx` | Tab: Οικονομικά -- P&L, aging, revenue/expense charts |
| `src/components/reports/ReportsProjects.tsx` | Tab: Έργα -- status, budget vs actual, timeline |
| `src/components/reports/ReportsClients.tsx` | Tab: Πελάτες -- revenue ranking, profitability |
| `src/components/reports/ReportsTeam.tsx` | Tab: Ομάδα -- workload, task completion, time tracking |
| `src/components/reports/ReportExportMenu.tsx` | Dropdown menu εξαγωγής (PDF/Excel/CSV) |
| `src/components/reports/ReportFilters.tsx` | Global filters component (period, client, project) |
| `src/hooks/useReportsData.ts` | Custom hook -- single data fetch για όλα τα report tabs |

### Τροποποιήσεις Υπαρχόντων

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/components/layout/AppSidebar.tsx` | Προσθήκη "Αναφορές" link με εικονίδιο `BarChart3` στο sidebar |
| `src/App.tsx` | Αφαίρεση redirect `/reports` -> `/financials`, νέο route `/reports` -> Reports page |
| `src/index.css` | Print-specific CSS (`@media print`) για καθαρή εξαγωγή PDF |

### Data Flow

Ο hook `useReportsData` θα κάνει ένα batch fetch από:
- `projects` (με client join)
- `invoices` (με client & project joins)
- `expenses` (με project join)
- `tasks` (με assignee & project joins)
- `clients`
- `time_entries` (για team reporting)
- `profiles` (για team member names)

Τα δεδομένα φιλτράρονται client-side βάσει των global filters (period, client, project) και περνάνε σε κάθε tab component.

### Export Functionality

Το `ReportExportMenu` θα προσφέρει 3 επιλογές:
1. **PDF**: `window.print()` με print-optimized layout (ήδη υποστηρίζεται, θα προστεθεί print CSS)
2. **Excel**: Χρήση `exportToExcel` από `src/utils/exportUtils.ts` -- δημιουργεί HTML table που ανοίγει στο Excel
3. **CSV**: Χρήση `exportToCSV` από `src/utils/exportUtils.ts` -- με BOM για ελληνικούς χαρακτήρες

Κάθε tab θα εκθέτει μια `getExportData()` function που επιστρέφει τα relevant δεδομένα σε tabular format για export.

### Sidebar Position

Η "Αναφορές" θα τοποθετηθεί μετά το "Λογιστήριο" στο κύριο navigation, με permission `financials.view` (ίδιο με Λογιστήριο, καθώς τα reports αφορούν κυρίως οικονομικά & project data).

