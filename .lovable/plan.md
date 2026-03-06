

# Org Chart — Διόρθωση Connectors, Auto-assign Προσωπικού & Αφαίρεση Demo

## Προβλήματα

1. **Connectors δεν λειτουργούν**: Το `OrgConnectors` χρησιμοποιεί `getBoundingClientRect()` που δίνει screen coordinates ΜΕ το zoom/pan transform εφαρμοσμένο. Αφού το SVG είναι μέσα στο ίδιο transformed div, οι συντεταγμένες δεν αντιστοιχούν. Πρέπει να χρησιμοποιήσουμε `offsetTop`/`offsetLeft` σχετικά με τον container.
2. **Δεν φαίνονται τα υπάρχοντα άτομα**: Στο wizard δεν υπάρχει βήμα αντιστοίχισης υπαρχόντων profiles σε θέσεις.
3. **Demo button** πρέπει να αφαιρεθεί.

## Αλλαγές

### 1. `OrgConnectors.tsx` — Fix connector paths
Αντικατάσταση `getBoundingClientRect()` με **`offsetTop`/`offsetLeft` relative positioning**. Αναδρομικός υπολογισμός offset σε σχέση με τον container div, ώστε οι γραμμές να είναι ανεξάρτητες από zoom/pan. Επίσης recompute on expand/collapse events.

### 2. `OrgChartWizard.tsx` — Auto-assign step
- Νέο βήμα (Step 2.5) "Αντιστοίχιση Προσωπικού": Μετά την επιλογή template, φέρνουμε τα profiles και κάνουμε auto-suggest matching βάσει `job_title` → `position_title` ή `department`.
- Ο χρήστης βλέπει πίνακα: Θέση | Προτεινόμενο Άτομο (dropdown) | Status
- Αφαίρεση dummy names logic και checkbox "Προσθήκη δοκιμαστικών ονομάτων".
- Κατά τη δημιουργία: αν υπάρχει matched profile, γράφει `user_id` στο position.

### 3. `OrgChart.tsx` — Αφαίρεση Demo
- Αφαίρεση `addDummyUsers` function, `DUMMY_NAMES`, `loadingDummyData` state
- Αφαίρεση Demo button από header
- Αφαίρεση `Database` import

## Αρχεία

| Αρχείο | Αλλαγή |
|---|---|
| `src/components/org-chart/OrgConnectors.tsx` | **Rewrite** — offset-based positioning αντί getBoundingClientRect |
| `src/components/org-chart/OrgChartWizard.tsx` | **Update** — Auto-assign step, αφαίρεση dummy logic |
| `src/pages/OrgChart.tsx` | **Update** — Αφαίρεση Demo button/logic, pass profiles στο Wizard |

