

# Calendar Tasks & Backlog Side Panel

## Πρόβλημα
Το ημερολόγιο δέχεται `allMyTasks` αλλά φιλτράρει μόνο tasks με `due_date` που ταιριάζει στην τρέχουσα εβδομάδα/ημέρα. Tasks χωρίς ημερομηνία ή overdue δεν φαίνονται πουθενά. Επίσης δεν υπάρχει τρόπος να δεις και να "πετάξεις" αυτά τα tasks μέσα στο ημερολόγιο.

## Αλλαγές

### 1. Εμφάνιση tasks στο ημερολόγιο
Τα tasks με `due_date` ή `start_date` εμφανίζονται ήδη αν ταιριάζουν σε κάποια μέρα. Θα βεβαιωθούμε ότι:
- Tasks με `start_date` (χωρίς due_date) τοποθετούνται στην αντίστοιχη μέρα
- Tasks χωρίς ώρα (midnight) εμφανίζονται στο **"Ολοήμ."** row κάτω από τις ημέρες
- Tasks με ώρα εμφανίζονται στο αντίστοιχο hour slot

### 2. Backlog Side Panel (Unscheduled + Overdue)
Νέο slide-out panel στα δεξιά του ημερολογίου:
- Toggle button στο header του calendar: `📋 Backlog (N)`
- Εμφανίζει **tasks χωρίς ημερομηνία** + **overdue tasks** (due_date < σήμερα, status ≠ completed)
- Κάθε task είναι **draggable** — μπορεί να "πεταχτεί" σε οποιαδήποτε μέρα ή ώρα στο ημερολόγιο
- Ξεχωριστές ενότητες: "Χωρίς ημερομηνία" και "Εκπρόθεσμα"
- Κουμπί κλεισίματος (X)

### 3. Drag from Backlog → Calendar
Τα backlog items χρησιμοποιούν `dataTransfer.setData('text/plain', taskId)` — ίδια μηχανική με τα ήδη υπάρχοντα calendar tasks, οπότε το `handleDrop` θα δουλεύει αυτόματα.

## Technical Details

- Το backlog panel υπολογίζεται μέσα στο `MyWorkCalendar` component από τα tasks που περνάει ο parent
- `unscheduledTasks = tasks.filter(t => !t.due_date && !t.start_date && t.status !== 'completed')`
- `overdueTasks = tasks.filter(t => t.due_date && isBefore(startOfDay(new Date(t.due_date)), startOfDay(new Date())) && t.status !== 'completed')`
- Panel width: ~280px, absolute positioned δεξιά μέσα στο Card
- Η λογική `isAllDay` θα ελέγχει και `start_date` αν δεν υπάρχει `due_date`

## Files

| File | Αλλαγή |
|------|--------|
| `src/components/my-work/MyWorkCalendar.tsx` | Add backlog panel (unscheduled + overdue), improve task date matching to include start_date, add toggle button |

