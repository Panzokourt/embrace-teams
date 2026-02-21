
# Εργασιακή Ημέρα (Work Day Clock) & Status Χρήστη

## Επισκόπηση

Προσθήκη λειτουργίας **Εργασιακής Ημέρας** στο TopBar: live ρολόι, αυτόματη/χειροκίνητη έναρξη και λήξη ημέρας, παρακολούθηση ωρών εργασίας σε πραγματικό χρόνο, status χρήστη, και καταγραφή όλων στη βάση. Η λειτουργία αυτή είναι **ξεχωριστή** από το task time tracking αλλά θα συνυπάρχει αρμονικά μαζί του.

---

## 1. Database — Νέοι Πίνακες & Στήλες

### Πίνακας `work_schedules` (Ωράριο χρήστη)
Ο χρήστης δηλώνει τις ημέρες και ώρες που εργάζεται.

| Στήλη | Τύπος | Περιγραφή |
|-------|-------|-----------|
| id | uuid PK | |
| user_id | uuid FK -> profiles | |
| company_id | uuid FK -> companies | |
| day_of_week | integer (0-6) | 0=Δευτέρα...6=Κυριακή |
| start_time | time | Ώρα έναρξης (π.χ. 09:00) |
| end_time | time | Ώρα λήξης (π.χ. 17:00) |
| is_working_day | boolean default true | Αν εργάζεται εκείνη τη μέρα |
| created_at, updated_at | timestamptz | |

UNIQUE constraint στο (user_id, day_of_week).

### Πίνακας `work_day_logs` (Καταγραφή ημερών)
Κάθε φορά που ο χρήστης ξεκινά/τελειώνει τη μέρα του.

| Στήλη | Τύπος | Περιγραφή |
|-------|-------|-----------|
| id | uuid PK | |
| user_id | uuid FK -> profiles | |
| company_id | uuid FK -> companies | |
| date | date | Ημερομηνία |
| clock_in | timestamptz | Ώρα έναρξης |
| clock_out | timestamptz, nullable | Ώρα λήξης |
| scheduled_minutes | integer | Προγραμματισμένα λεπτά βάσει ωραρίου |
| actual_minutes | integer default 0 | Πραγματικά λεπτά εργασίας |
| status | text | `active`, `completed`, `overtime`, `absent` |
| auto_started | boolean default false | Αν ξεκίνησε αυτόματα από login |
| notes | text | |
| created_at | timestamptz | |

UNIQUE constraint στο (user_id, date).

### Στήλη `work_status` στο `profiles`
Νέα στήλη στον πίνακα profiles:

| Στήλη | Τύπος | Τιμές |
|-------|-------|-------|
| work_status | text, default 'offline' | `online`, `busy`, `away`, `on_leave`, `offline` |

### RLS Policies
- `work_schedules`: SELECT/INSERT/UPDATE για τον ίδιο χρήστη. Admin/Manager βλέπουν/διαχειρίζονται όλα.
- `work_day_logs`: SELECT/INSERT/UPDATE για τον ίδιο χρήστη. Admin/Manager βλέπουν όλα.
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE work_day_logs;`

---

## 2. TopBar — Work Day Clock Widget

Στο αριστερό μέρος του TopBar (πριν το search) θα εμφανίζεται:

```
[Ημερομηνία] | [Live Ρολόι] | [Εργάσιμος Χρόνος: 05:23:41] | [Start Day / End Day] | [Status ●]
```

### Στοιχεία:
- **Live ημερομηνία και ώρα**: Ενημερώνεται κάθε δευτερόλεπτο
- **Εργάσιμος χρόνος**: Μετρητής από την ώρα clock_in, σε μορφή HH:MM:SS
  - Πράσινο χρώμα: κανονικές ώρες
  - Κόκκινο χρώμα + pulse: όταν ξεπεράσει τις δηλωμένες ώρες εργασίας (π.χ. 8ω)
  - Πορτοκαλί: όταν πλησιάζει (τελευταία 30 λεπτά)
- **Start Day**: Κουμπί που ξεκινά την εργασιακή ημέρα (δημιουργεί work_day_log)
- **End Day**: Κουμπί που κλείνει τη μέρα (ενημερώνει clock_out, υπολογίζει actual_minutes)
- **Status indicator**: Dropdown με τα status (Ενεργός, Απασχολημένος, Εκτός, Σε Άδεια)

### Αυτόματη έναρξη στο Login
- Κατά το login, αν είναι εργάσιμη ημέρα βάσει του `work_schedules` και δεν υπάρχει ήδη log για σήμερα, εμφανίζεται toast: "Καλημέρα! Ξεκίνησε η εργασιακή σου ημέρα" και δημιουργείται αυτόματα work_day_log.
- Αν δεν είναι εργάσιμη ημέρα: toast "Σήμερα δεν είναι εργάσιμη ημέρα. Θέλεις να ξεκινήσεις;"

### Μηνύματα/Alerts
- Στο clock_in: "Καλημέρα [Όνομα]! Ώρα έναρξης: HH:MM"
- Πριν λήξει το ωράριο (30 λεπτά πριν): notification "Το ωράριό σου λήγει σε 30 λεπτά"
- Μετά τη λήξη: "Υπερωρία! Έχεις ξεπεράσει τις κανονικές ώρες κατά X λεπτά"
- Στο End Day: "Καλό απόγευμα! Συνολικές ώρες σήμερα: X"

---

## 3. Work Schedule Settings

Στη σελίδα **Settings** (`/settings`) θα προστεθεί νέο Card "Ωράριο Εργασίας":

- Πίνακας 7 ημερών (Δευτέρα - Κυριακή)
- Για κάθε ημέρα: checkbox "Εργάσιμη", ώρα έναρξης, ώρα λήξης
- Default: Δευ-Παρ 09:00-17:00, Σαβ-Κυρ off
- Υπολογισμός εβδομαδιαίων ωρών

---

## 4. Hook: `useWorkDay`

Νέο custom hook που θα διαχειρίζεται τη λογική:

```
useWorkDay() -> {
  todayLog, schedule, isWorkingDay,
  clockIn, clockOut,
  elapsedMinutes, scheduledMinutes,
  isOvertime, isNearEnd,
  workStatus, setWorkStatus
}
```

---

## 5. Ενοποίηση με Timesheets

- Στη σελίδα Timesheets θα εμφανίζεται νέα ενότητα "Παρουσίες" (attendance) με τα work_day_logs
- Οι Admins/Managers θα μπορούν να δουν τις παρουσίες όλων
- Στο Employee Profile θα εμφανίζεται το ωράριο και το ιστορικό παρουσιών

---

## 6. User Status

### Τιμές:
| Τιμή | Ετικέτα | Χρώμα |
|------|---------|-------|
| online | Ενεργός | Πράσινο |
| busy | Απασχολημένος | Κόκκινο |
| away | Εκτός | Κίτρινο |
| on_leave | Σε Άδεια | Μπλε |
| offline | Εκτός Σύνδεσης | Γκρι |

- Αυτόματη αλλαγή σε `online` κατά το clock_in
- Αυτόματη αλλαγή σε `offline` κατά το clock_out / signOut
- Χειροκίνητη αλλαγή μέσω dropdown στο TopBar

---

## Αρχεία που Δημιουργούνται / Αλλάζουν

| Αρχείο | Αλλαγή |
|--------|--------|
| **Migration SQL** | Πίνακες work_schedules, work_day_logs + profiles.work_status + RLS + realtime |
| `src/hooks/useWorkDay.ts` | **Νέο** — Hook διαχείρισης εργασιακής ημέρας |
| `src/components/topbar/WorkDayClock.tsx` | **Νέο** — Widget live ρολοιού, timer, start/end day, status |
| `src/components/layout/TopBar.tsx` | Ενσωμάτωση WorkDayClock |
| `src/pages/Settings.tsx` | Νέο Card "Ωράριο Εργασίας" |
| `src/contexts/AuthContext.tsx` | Αυτόματη αλλαγή status σε offline κατά το signOut |

---

## Τεχνικές Σημειώσεις

- Ο μετρητής εργάσιμου χρόνου τρέχει client-side (setInterval κάθε 1s) αλλά η πηγή αλήθειας είναι το `clock_in` στη βάση
- Η σχέση Εργασιακή Ημέρα vs Task Timers: είναι ανεξάρτητες. Ένας χρήστης μπορεί να έχει ενεργή εργασιακή ημέρα χωρίς task timer και αντίστροφα
- Τα work_day_logs χρησιμοποιούν UNIQUE(user_id, date) για αποφυγή διπλών εγγραφών
- Η αυτόματη έναρξη γίνεται μέσω του hook, όχι μέσω trigger στη βάση
