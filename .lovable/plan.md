
# Αναδιάρθρωση Καρτέλας Έργου — Νέο Compact Layout

## Τι είναι τώρα (πρόβλημα)

Το Overview tab έχει 6 ξεχωριστά blocks που "τεντώνουν" τη σελίδα κατακόρυφα:
1. **ProjectInfoEditor** (μία κάρτα ολόκληρη — μόνο read/edit mode)
2. **ProjectTeamManager** (μια κάρτα ολόκληρη — grid 2 columns με avatars)
3. **Πρόοδος Έργου** (αριστερό grid)
4. **Σύνοψη** (δεξί grid — επαναλαμβάνει Budget που ήδη φαίνεται στο Quick Stats header)
5. **AI Analysis** (κάρτα)
6. **Πρόσφατα Tasks** (κάρτα)

Επίσης τα Quick Stats cards 4 επαναλαμβάνουν πληροφορίες που φαίνονται και κάτω.

---

## Νέο Layout — Compact Two-Column Overview

### Αλλαγή 1: Header με inline status badge + key info

Το header θα γίνει πιο πλούσιο — θα δείχνει επιπλέον Client, Dates, Progress bar — έτσι ώστε να μην χρειάζεται ξεχωριστή "Σύνοψη" κάρτα.

### Αλλαγή 2: Quick Stats — μειώνουμε σε 3 πιο στρατηγικά KPIs

Αφαιρείται η επανάληψη. Τα Stats γίνονται: **Budget**, **Πρόοδος (%)**, **Λήξη** + **Κατάσταση** inline στο header.

### Αλλαγή 3: Overview Tab — Two-column grid

```text
┌─────────────────────────────┬──────────────────────────┐
│  Πληροφορίες Έργου          │  Ομάδα Έργου             │
│  (ProjectInfoEditor)        │  (compact avatar strip)  │
│  — Όνομα, Περιγραφή         │  — Avatars inline        │
│  — Budget, Agency Fee       │  — +Προσθήκη button      │
│  — Ημ/νίες                  │                          │
│  — Κατάσταση                │  Πρόοδος                 │
│                             │  — Deliverables %        │
│                             │  — Tasks %               │
└─────────────────────────────┴──────────────────────────┘
┌─────────────────────────────┬──────────────────────────┐
│  Πρόσφατα Tasks (5)         │  AI Ανάλυση              │
│  — Mini list                │  — Compact               │
└─────────────────────────────┴──────────────────────────┘
```

### Αλλαγή 4: Compact Team Section

Αντί για grid cards για κάθε μέλος, η Ομάδα θα εμφανίζεται ως **avatar stack** με tooltip — compact, ελάχιστος χώρος. Ένα κουμπί "Προβολή Όλων/Επεξεργασία" ανοίγει το υπάρχον dialog.

### Αλλαγή 5: Αφαίρεση Σύνοψης κάρτας

Η κάρτα "Σύνοψη" (Budget + Agency Fee + Εκτιμώμενη Αμοιβή) αφαιρείται — αυτές οι τιμές ήδη φαίνονται στο ProjectInfoEditor και στα Quick Stats.

---

## Τεχνικές Αλλαγές

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/pages/ProjectDetail.tsx` | Αναδιάρθρωση του Overview tab σε 2-column grid layout, αφαίρεση επαναλαμβανόμενων sections |
| `src/components/projects/ProjectTeamManager.tsx` | Προσθήκη compact mode prop — εμφανίζει avatar stack αντί για grid cards |
| `src/pages/ProjectDetail.tsx` | Quick Stats: 4 → 3 cards, αφαίρεση επανάληψης Budget |

### Λεπτομέρειες ProjectTeamManager compact mode

Νέο prop `compact?: boolean`. Όταν `compact=true`:
- Εμφανίζει avatars σε οριζόντιο stack (overlap style) με tooltip on hover
- Δείχνει badge "+N" αν πάνω από 4 μέλη
- Κουμπί "Διαχείριση Ομάδας" ανοίγει dialog για full management
- Κουμπί "+ Προσθήκη" για άμεση πρόσθεση

### Λεπτομέρειες Quick Stats

Αφαιρείται η κάρτα "Budget" (επανάληψη) και αντικαθίσταται με card **"Πρόοδος"** που δείχνει το συνολικό % progress από tasks+deliverables.

### Νέα δομή Overview:

```text
ROW 1 (lg:grid-cols-3):
- col-span-2: Πληροφορίες Έργου (ProjectInfoEditor, full width)
- col-span-1: Ομάδα (compact avatars) + Πρόοδος (progress bars)

ROW 2 (lg:grid-cols-3):
- col-span-2: Πρόσφατα Tasks
- col-span-1: AI Ανάλυση (collapsed/compact)
```

---

## Bonus Βελτιώσεις

1. **Sticky Tab Bar**: Τα tabs "κολλάνε" στο top όταν scrollάρεις
2. **Status Badge** στο header γίνεται κλικάρισιμο — αλλάζεις status άμεσα (quick inline edit)
3. **Due Date countdown**: Αν υπάρχει end_date, το header δείχνει "σε X ημέρες" ή "Εκπρόθεσμο" με χρώμα
