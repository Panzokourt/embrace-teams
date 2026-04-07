

# Task Progress Auto-Calculation & Unified Status/Progress Bar

## Αλλαγές

### 1. Auto-calculated progress based on status
Αντί χειροκίνητης εισαγωγής, η πρόοδος υπολογίζεται αυτόματα:

| Status | Progress |
|--------|----------|
| todo | 0% |
| in_progress | 20% |
| review | 50% |
| internal_review | 65% |
| client_review | 80% |
| completed | 100% |

Αν υπάρχουν subtasks, η πρόοδος υπολογίζεται από αυτά (completed/total). Αφαίρεση του manual progress slider από τη σελίδα.

### 2. Unified Status Flow + Progress Bar (full-width, top)
Αντικατάσταση του vertical "Ροή Κατάστασης" card (αριστερή στήλη) και της μικρής progress bar (subtasks) με ένα **οριζόντιο interactive stepper** που θα μπαίνει κάτω από τη sticky action bar και πάνω από το 3-column grid, πιάνοντας ολόκληρο το πλάτος.

```text
┌─────────────────────────────────────────────────────────┐
│  Back │ Title │ Timer │ ... │ Status │ Due │ ✓         │  ← Sticky bar
├─────────────────────────────────────────────────────────┤
│  ●───────●───────●───────●───────●───────○    87%      │  ← NEW: Status stepper
│  Προς    Σε      Αναθ.   Εσωτ.   Πελάτης  Ολοκλ.     │
├─────────────────────────────────────────────────────────┤
│  LEFT     │     CENTER      │       RIGHT              │
│  col-3    │     col-5       │       col-4              │
```

- Κάθε στάδιο είναι **clickable** — πατώντας αλλάζει το status
- Η μπάρα μεταξύ των σταδίων γεμίζει χρωματιστά μέχρι το τρέχον στάδιο
- Δεξιά εμφανίζεται το ποσοστό πρόοδου

### 3. Cleanup
- Αφαίρεση του "Ροή Κατάστασης" card από την αριστερή στήλη
- Αφαίρεση του manual progress slider (αν υπάρχει)
- Η progress bar στα subtasks παραμένει ως secondary indicator (subtask-only)

## Technical Details

- Νέο `STATUS_PROGRESS` map στο TaskDetail.tsx
- `displayProgress` = subtasks.length > 0 ? subtaskProgress : STATUS_PROGRESS[status]
- Ο stepper χρησιμοποιεί τα υπάρχοντα `STATUS_ORDER` και `STATUS_CONFIG`
- Κάθε κόμβος καλεί `handleStatusChange(s)` (ήδη υπάρχει)
- Η μπάρα DB update: η στήλη `progress` δεν αλλάζει (backward compatible), απλά δεν εμφανίζεται στο UI

## Files

| File | Αλλαγή |
|------|--------|
| `src/pages/TaskDetail.tsx` | Add STATUS_PROGRESS map, add full-width stepper below action bar, remove "Ροή Κατάστασης" card, remove manual progress input |

