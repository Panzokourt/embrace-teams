

# Προσθήκη Tab "Εργασίες" και Φίλτρων Τμήματος/Ατόμου στις Αναφορές

## Τι αλλάζει

### 1. Νέο Tab "Εργασίες"

Προστίθεται 6ο tab στις Αναφορές με αναλυτική προβολή tasks:

- **KPI Cards**: Σύνολο tasks, σε εξέλιξη, ολοκληρωμένα, overdue/critical
- **Critical Deadline Table**: Πίνακας με tasks που πλησιάζουν ή έχουν ξεπεράσει deadline, ταξινομημένα κατά urgency (overdue πρώτα, μετά τα επόμενα 7 ημέρες)
- **Status Pie Chart**: Κατανομή tasks ανά status (todo, in_progress, done, blocked)
- **Priority Bar Chart**: Κατανομή ανά priority (critical, high, medium, low)
- **Αναλυτικός πίνακας**: Όλα τα tasks με στήλες: Τίτλος, Έργο, Ανατεθειμένο σε, Προτεραιότητα, Status, Due Date, Πρόοδος
- **Export support**: CSV/Excel εξαγωγή του πίνακα tasks

### 2. Νέα Φίλτρα: Τμήμα και Άτομο

Προστίθενται 2 νέα global φίλτρα δίπλα στα υπάρχοντα:

- **Τμήμα**: Dropdown με τα departments -- φιλτράρει tasks/profiles βάσει department_id του assigned_to
- **Άτομο**: Dropdown με τα profiles -- φιλτράρει tasks βάσει assigned_to

Τα φίλτρα εφαρμόζονται σε ΟΛΑ τα tabs (tasks, team, projects κλπ).

## Τεχνικές Αλλαγές

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/hooks/useReportsData.ts` | Προσθήκη `departments` στο fetch, νέα πεδία `departmentId` και `userId` στο `ReportsFilters`, φιλτράρισμα tasks/profiles βάσει αυτών |
| `src/components/reports/ReportFilters.tsx` | Προσθήκη 2 νέων Select dropdowns (Τμήμα, Άτομο), νέα props `departments` και `profiles` |
| `src/components/reports/ReportsTasks.tsx` | **Νέο αρχείο** -- Πλήρες tab component με KPIs, critical deadline πίνακα, charts, αναλυτικό πίνακα |
| `src/pages/Reports.tsx` | Προσθήκη tab "Εργασίες", import ReportsTasks, export handlers για tasks, περνάει departments/profiles στο ReportFilters |

### Data Flow για φίλτρα

- Το `useReportsData` κάνει fetch departments από Supabase
- Όταν επιλέγεται Τμήμα, φιλτράρονται tasks που ο assigned_to ανήκει σε αυτό το department (μέσω profiles.department_id)
- Όταν επιλέγεται Άτομο, φιλτράρονται tasks με assigned_to === userId
- Τα φίλτρα λειτουργούν σωρευτικά με τα υπάρχοντα (περίοδος, πελάτης, έργο)

### Critical Deadline Logic

Ένα task θεωρείται "critical" αν:
- **Overdue**: `due_date < today` και status !== done/completed
- **Κρίσιμο**: `due_date` εντός 3 ημερών και status !== done/completed  
- **Σύντομα**: `due_date` εντός 7 ημερών και status !== done/completed

