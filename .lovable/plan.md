
# Δύο Νέα Στάδια Task: Εσωτερική Έγκριση & Έγκριση Πελάτη

## Τι αλλάζει στη βάση (Migration)

Το υπάρχον enum `task_status` έχει μόνο 4 τιμές: `todo | in_progress | review | completed`. Χρειάζεται να προσθέσουμε 2 νέες:

- **`internal_review`** — Εσωτερική Έγκριση (ο αμέσως ανώτερος ιεραρχικά)
- **`client_review`** — Έγκριση Πελάτη (θα ορίζεται χειροκίνητα, π.χ. project manager)

Επίσης, για να γνωρίζει το σύστημα ποιος είναι ο "εσωτερικός εγκριτής", χρειάζεται ένα νέο πεδίο `internal_reviewer` (UUID, nullable) στον πίνακα `tasks`. Αυτό θα συμπληρώνεται **αυτόματα** όταν ένα task μεταβεί σε `internal_review`, βάσει της ιεραρχίας:
1. Πρώτα: `profiles.reports_to` (άμεσος manager)
2. Αν δεν υπάρχει: `departments.head_user_id` (επικεφαλής τμήματος)
3. Αν δεν υπάρχει: fallback στον υπάρχοντα `approver`

## Αρχιτεκτονική Ιεραρχικής Ανάθεσης

```text
Χρήστης αλλάζει task σε "Εσωτερική Έγκριση"
        ↓
Frontend: κοιτά το profiles.reports_to του assigned_to
        ↓ (αν null)
κοιτά το departments.head_user_id του τμήματος του assigned_to
        ↓ (αν null)
χρησιμοποιεί τον υπάρχοντα approver
        ↓
Αποθηκεύει task με status='internal_review' και internal_reviewer=<id>
        ↓
Ο internal_reviewer βλέπει το task στο My Work του στο section "Προς Έγκριση"
```

## Τι αλλάζει σε κάθε αρχείο

### 1. Database Migration (νέα migration)

```sql
-- Προσθήκη νέων τιμών στο enum task_status
ALTER TYPE task_status ADD VALUE 'internal_review';
ALTER TYPE task_status ADD VALUE 'client_review';

-- Νέο πεδίο για εσωτερικό εγκριτή
ALTER TABLE tasks ADD COLUMN internal_reviewer uuid REFERENCES profiles(id);
```

### 2. `src/pages/Tasks.tsx` — Kanban & Status Config

Προσθήκη 2 νέων columns στο Kanban view:
- `internal_review` → "Εσωτερική Έγκριση" (χρώμα: violet/purple)
- `client_review` → "Έγκριση Πελάτη" (χρώμα: orange)

Ενημέρωση του `statusConfig` object με icons και labels.

Λογική status transition: όταν ένα task drag-and-drop σε `internal_review`, η `handleStatusChange` θα κάνει query τον `reports_to` / `department.head_user_id` του assigned_to και θα αποθηκεύει αυτόματα τον `internal_reviewer`.

### 3. `src/components/tasks/TasksTableView.tsx` — Table View

Ενημέρωση του `STATUS_OPTIONS` array με τα 2 νέα statuses και τα σωστά labels/colors.

### 4. `src/pages/TaskDetail.tsx` — Task Detail Page

Ενημέρωση του `STATUS_CONFIG` object. Προσθήκη εμφάνισης του `internal_reviewer` στο Properties Grid (μόνο για tasks σε `internal_review`). Λογική αυτόματης ανάθεσης internal_reviewer κατά την αλλαγή status.

### 5. `src/components/projects/ProjectTasksManager.tsx`

Ενημέρωση του τύπου `TaskStatus` και των `getStatusLabel`/`getStatusIcon` functions. Ενημέρωση Select options στο form.

### 6. `src/pages/MyWork.tsx` — Σελίδα "My Work"

Αυτή είναι η **κεντρική αλλαγή** στο UX. Το υπάρχον section "Εκκρεμείς Εγκρίσεις Tasks" δείχνει ήδη tasks όπου `approver = user.id` και `status = 'review'`. Θα επεκταθεί για να δείχνει και tasks όπου:

- `internal_reviewer = user.id` AND `status = 'internal_review'`

Το section θα μετονομαστεί σε **"Προς Έγκριση"** και θα χωρίζεται σε 2 υπο-ομάδες:

```text
┌─────────────────────────────────────────────────────────┐
│  Προς Έγκριση (N)                                        │
│  ─────────────────────────────────────────────────────  │
│  🏢 Εσωτερική Έγκριση                                    │
│  □ [Task Title]  [Έργο]  [Assignee]  [✓ Έγκριση] [✗]  │
│  □ [Task Title]  [Έργο]  [Assignee]  [✓ Έγκριση] [✗]  │
│                                                         │
│  🤝 Έγκριση Πελάτη (υπάρχον review + approver)         │
│  □ [Task Title]  [Έργο]  [Priority]  [✓] [✗]           │
└─────────────────────────────────────────────────────────┘
```

**Fetch logic στο My Work:**
```typescript
// Internal reviews που ο current user είναι internal_reviewer
supabase.from('tasks')
  .select(...)
  .eq('internal_reviewer', user.id)
  .eq('status', 'internal_review')

// Client reviews που ο current user είναι approver
supabase.from('tasks')
  .select(...)
  .eq('approver', user.id)
  .eq('status', 'review') // υπάρχον 'review' OR 'client_review'
```

**Approve/Reject actions για internal_review:**
- **Έγκριση**: status → `client_review` (αν υπάρχει approver) ή `completed`
- **Απόρριψη**: status → `in_progress`, εμφάνιση toast

**Approve/Reject actions για client_review:**
- **Έγκριση**: status → `completed`
- **Απόρριψη**: status → `in_progress`

### 7. RLS Policy για `internal_reviewer`

Χρειάζεται νέα RLS policy ώστε ο `internal_reviewer` να μπορεί να βλέπει και να ενημερώνει τα tasks που του έχουν ανατεθεί για έγκριση:

```sql
-- Ο internal_reviewer μπορεί να βλέπει τα tasks
CREATE POLICY "Users can view tasks for internal review"
ON tasks FOR SELECT
USING (auth.uid() = internal_reviewer);

-- Ο internal_reviewer μπορεί να ενημερώνει το status
CREATE POLICY "Internal reviewers can update task status"
ON tasks FOR UPDATE
USING (auth.uid() = internal_reviewer);
```

## Ροή Χρήστη (UX Flow)

```text
[Assignee] Ολοκληρώνει εργασία
    ↓
Αλλάζει status σε "Εσωτερική Έγκριση"
    ↓
Σύστημα: βρίσκει αυτόματα τον ανώτερο ιεραρχικά
  → reports_to ή department head
    ↓
[Manager] Βλέπει task στο MY WORK > "Προς Έγκριση"
    ↓
  [Εγκρίνει] → status: "Έγκριση Πελάτη" ή "Ολοκληρώθηκε"
  [Απορρίπτει] → status: "Σε Εξέλιξη" (επιστροφή στον assignee)
    ↓
[Approver/PM] Βλέπει task στο MY WORK > "Έγκριση Πελάτη"
    ↓
  [Εγκρίνει] → status: "Ολοκληρώθηκε"
  [Απορρίπτει] → status: "Σε Εξέλιξη"
```

## Αρχεία που αλλάζουν

| Αρχείο | Τύπος αλλαγής |
|--------|---------------|
| `supabase/migrations/new.sql` | Migration: νέες τιμές enum + πεδίο internal_reviewer + RLS policies |
| `src/pages/Tasks.tsx` | Νέα status columns στο Kanban, λογική internal_reviewer |
| `src/components/tasks/TasksTableView.tsx` | STATUS_OPTIONS ενημέρωση |
| `src/pages/TaskDetail.tsx` | STATUS_CONFIG, Properties Grid, αυτόματη ανάθεση internal_reviewer |
| `src/components/projects/ProjectTasksManager.tsx` | TaskStatus type, labels, Select options |
| `src/pages/MyWork.tsx` | Section "Προς Έγκριση" με ιεραρχία, approve/reject logic |
| `src/hooks/useRealtimeSubscription.ts` | Ενδεχομένως ενημέρωση για νέα statuses |

## Σημαντικές Τεχνικές Σημειώσεις

- Η αυτόματη ανάθεση `internal_reviewer` γίνεται **client-side** κατά τη στιγμή της αλλαγής status — αποφεύγουμε edge function για λόγους απλότητας
- Η ιεραρχία ανάγνωσης (reports_to → dept head → approver) εφαρμόζεται παντού όπου αλλάζει status σε `internal_review`
- Οι existing tasks με `status='review'` συνεχίζουν να λειτουργούν κανονικά — δεν σπάει backward compatibility
- Το `client_review` θα αντικαταστήσει λειτουργικά το παλιό `review` status ως "Έγκριση από Πελάτη", ενώ το παλιό `review` παραμένει ως "Αναθεώρηση" για backward compat
