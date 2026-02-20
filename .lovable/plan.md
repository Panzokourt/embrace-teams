
# Urgent Dashboard: Flag Tasks + "Επείγοντα" Κεντρικό Panel

## Τι υπάρχει ήδη

Το priority system (`low | medium | high | urgent`) υπάρχει ήδη στη βάση και στα components. Δεν χρειάζεται migration. Τα tasks εμφανίζουν ήδη priority badges στον πίνακα και στο TaskDetail. Αυτό που λείπει είναι:

1. **Γρήγορος τρόπος να σημαίνεις ένα task "urgent"** με ένα κλικ (flag button) — χωρίς να ανοίξεις dialog
2. **Κεντρικό Urgent Dashboard** στο My Work που συγκεντρώνει σε ένα panel ΟΛΕΣ τις κρίσιμες καταστάσεις: overdue + high/urgent priority + pending approvals

## Δεν χρειάζεται Migration

Το πεδίο `priority` στον πίνακα `tasks` ήδη υποστηρίζει `'urgent'` και `'high'`. Μόνο frontend αλλαγές.

---

## Αλλαγή 1: Flag Button σε κάθε Task Row (My Work + Tasks Table)

### `SortableTaskRow` στο `MyWork.tsx`

Προσθήκη ενός **Flag icon button** δίπλα στο timer button:

```text
[☰] [✓] [Task Title]  [Έργο]  [Έναρξη]  [Λήξη]  [Status]  [Priority]  [▶] [🚩]
                                                                               ↑ Νέο
```

- Αν `priority === 'urgent'` → κόκκινο γεμιστό flag 🚩 (`text-destructive`)
- Αν `priority === 'high'` → πορτοκαλί flag 🏴 (`text-orange-500`)
- Αν άλλο → γκρι outline flag (`text-muted-foreground`)
- **Κλικ**: Toggles μεταξύ `priority = 'urgent'` (αν δεν ήταν urgent) ή `priority = 'medium'` (αν ήταν urgent) — αμέσως, χωρίς confirm

### `TasksTableView.tsx`

Ίδιο Flag button στο τέλος κάθε row, διαθέσιμο σε όλους (όχι μόνο admin).

---

## Αλλαγή 2: "Επείγοντα" Panel στο My Work

Νέο **"Επείγοντα" Card** που εμφανίζεται **πάνω από το "Προς Έγκριση"** section (ή ενσωματωμένο με αυτό), συγκεντρώνοντας:

```text
┌─────────────────────────────────────────────────────────────────┐
│  🚨 Επείγοντα (N)                                                │
│  ─────────────────────────────────────────────────────────────  │
│  🔴 Εκπρόθεσμα (N)                                              │
│  □ [Task]  [Έργο]  [Due 14/02 !!!]  [Status]  [▶] [🚩]         │
│                                                                 │
│  🟠 Υψηλή Προτεραιότητα (N)                                     │
│  □ [Task]  [Έργο]  [Due 28/02]  [Status]  [▶] [🚩]             │
│                                                                 │
│  🟡 Προς Έγκριση (N)                                            │
│  [Εσωτερική / Πελάτη tasks ...]                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Λογική συλλογής δεδομένων

Τα data ήδη φορτώνονται στο `fetchAll()`. Χρειάζεται μόνο να προστεθεί μια νέα υπολογιστή κατηγορία:

```typescript
// Overdue: ήδη υπάρχει ως todayTasks.filter(t => isBefore(due, today))
// High priority non-completed: ήδη στο allTasks
const urgentTasks = allTasks.filter(t => 
  (t.priority === 'urgent' || t.priority === 'high') && 
  !isBefore(startOfDay(new Date(t.due_date || '9999')), today) // αποκλείει τα overdue (ήδη στη πρώτη κατηγορία)
);
```

**Αποφυγή duplicates**: Ένα task overdue+high_priority εμφανίζεται μόνο στο "Εκπρόθεσμα".

---

## Αλλαγή 3: KPI Strip αναβάθμιση στο My Work

Τo υπάρχον strip έχει: Tasks Σήμερα | Ώρες Σήμερα | Overdue

Αναβάθμιση με **4th card "Urgent"** ή αλλαγή της Overdue card σε "Κρίσιμα" που μετράει `overdue + urgent/high`:

```text
[Tasks Σήμερα]  [Ώρες Σήμερα]  [Εκπρόθεσμα]  [Προς Έγκριση]
```

Το KPI "Προς Έγκριση" θα δείχνει `internalReviewTasks.length + approvalTasks.length` με badge κίτρινο/πορτοκαλί.

---

## Αλλαγή 4: Quick Flag στο TaskDetail

Στη σελίδα Task Detail, πάνω δεξιά κοντά στα status buttons, προσθήκη ενός **"Σήμανση ως Επείγον"** toggle button με Flag icon:

```typescript
<Button
  variant={task.priority === 'urgent' ? 'destructive' : 'outline'}
  size="sm"
  onClick={() => updateField('priority', task.priority === 'urgent' ? 'medium' : 'urgent')}
  className="gap-2"
>
  <Flag className="h-4 w-4" />
  {task.priority === 'urgent' ? 'Επείγον ✓' : 'Σήμανση ως Επείγον'}
</Button>
```

---

## Αρχεία που αλλάζουν

| Αρχείο | Τύπος αλλαγής |
|--------|---------------|
| `src/pages/MyWork.tsx` | Νέο "Επείγοντα" panel, 4th KPI card, flag toggle στο SortableTaskRow, νέα `urgentTasks` state |
| `src/pages/TaskDetail.tsx` | Quick Flag button στο header |
| `src/components/tasks/TasksTableView.tsx` | Flag button στο table row για inline priority toggle |

**Δεν χρειάζεται migration** — το priority field υποστηρίζει ήδη `'urgent'`.

---

## UX Λεπτομέρειες

- **Flag toggle**: Άμεσο feedback με toast "Σημάνθηκε ως Επείγον!" / "Αφαιρέθηκε η σήμανση"
- **Urgent Panel**: Εμφανίζεται μόνο αν υπάρχουν items (όπως το "Προς Έγκριση")
- **Unified Panel**: Το "Επείγοντα" και "Προς Έγκριση" **συγχωνεύονται** σε ένα "Απαιτούν Προσοχή" card με 3 sub-sections (Εκπρόθεσμα / Υψηλή Προτεραιότητα / Προς Έγκριση), για πιο compact UI
- **Task row click**: Ανοίγει το task sheet (existing behavior)
- **Sorting**: Εντός κάθε sub-section, τα tasks ταξινομούνται κατά `due_date` ascending (overdue πρώτα)

## Αρχιτεκτονική "Απαιτούν Προσοχή" Panel

```text
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️  Απαιτούν Προσοχή (N συνολικά)                              │
├─────────────────────────────────────────────────────────────────┤
│  🔴 Εκπρόθεσμα (N)                               [collapse ▲]  │
│  [task rows με κόκκινη ημερομηνία + flag button]                │
├─────────────────────────────────────────────────────────────────┤
│  🟠 Υψηλή Προτεραιότητα (N)                      [collapse ▲]  │
│  [task rows με πορτοκαλί priority badge + flag button]          │
├─────────────────────────────────────────────────────────────────┤
│  🟡 Εσωτερική Έγκριση (N)                                       │
│  [υπάρχοντα rows with ✓/✗]                                      │
├─────────────────────────────────────────────────────────────────┤
│  🤝 Έγκριση Πελάτη (N)                                          │
│  [υπάρχοντα rows with ✓/✗]                                      │
└─────────────────────────────────────────────────────────────────┘
```

Αυτό αντικαθιστά το παλιό "Προς Έγκριση" Card και συγκεντρώνει **όλα τα urgent items** σε ένα σημείο.
