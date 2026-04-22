

## Επεξεργασία Work Day Clock μέσω popover

### Πρόβλημα
Το popover που έφτιαξα στο προηγούμενο βήμα είναι στον **Active Task Timer** (ο χρόνος εργασίας πάνω σε συγκεκριμένο task — εμφανίζεται μόνο όταν τρέχει task timer). Στο screenshot σου όμως κλικάρεις στο **Work Day Clock** (`03:44:56 / 8ω`) — διαφορετικός μηχανισμός (`useWorkDay` / πίνακες `work_day_logs` + `work_schedules`), που μέχρι τώρα δεν είχε popover για επεξεργασία.

### Λύση: Νέο `WorkDayClockPopover`

Νέο component που τυλίγει το νούμερο `HH:MM:SS / 8ω` του WorkDayClock και ανοίγει popover με:

**Section 1 — Σύνοψη ημέρας**
- Live elapsed time (μεγάλο, χρωματισμένο όπως τώρα: πράσινο/πορτοκαλί/κόκκινο για overtime).
- Ημερομηνία + κατάσταση (`Ενεργός` / `Σε υπερωρία` / `Κοντά στη λήξη`).
- Προοδιαστική μπάρα `elapsed / scheduled` με ποσοστό.

**Section 2 — Επεξεργασία ώρας έναρξης (Clock-in)**
- Πεδίο `datetime-local` με την τρέχουσα `clock_in` τιμή (σε local TZ).
- Κουμπί `Αποθήκευση`: κάνει `update` στο `work_day_logs.clock_in` για το today's log (μόνο εφόσον υπάρχει log και η νέα ώρα δεν είναι στο μέλλον). Ξανα-fetch + ο elapsed counter γυρίζει αυτόματα γιατί υπολογίζεται από το `clock_in`.

**Section 3 — Ημερήσιος στόχος ωρών**
- Number input (ώρες, 0.5 step), default = `scheduledMinutes / 60`.
- Επιλογή `radio`:
  - `Μόνο σήμερα` → ενημερώνει `work_day_logs.scheduled_minutes` του today log.
  - `Μόνιμα για [όνομα ημέρας]` → ενημερώνει το `work_schedules` row για το `day_of_week` της σημερινής μέρας (κρατώντας το `start_time`, ορίζοντας `end_time = start_time + N hours`).
- Κουμπί `Αποθήκευση στόχου`.

**Section 4 — Quick actions**
- `Λήξη ημέρας` (αν `isClockedIn`) → καλεί υπάρχον `clockOut()`.
- `Πλήρες ωράριο →` link button που πάει στις ρυθμίσεις work schedule (αν υπάρχει σχετικό route — προαιρετικά parking για future).

### Τεχνικές αλλαγές

1. **Νέο αρχείο**: `src/components/topbar/WorkDayClockPopover.tsx`
   - Δέχεται όλα τα state από `useWorkDay`: `todayLog`, `elapsedSeconds`, `scheduledMinutes`, `isOvertime`, `isNearEnd`, `clockOut`, `fetchSchedule`, `schedule` (για να βρει το today's row για permanent updates).
   - Εκθέτει `children` (το trigger button).
   - Mutations:
     - `update work_day_logs set clock_in = ... where id = todayLog.id`
     - `update work_day_logs set scheduled_minutes = ... where id = todayLog.id`
     - `update work_schedules set end_time = ... where id = todaySchedule.id`
   - Καλεί `fetchSchedule()` (το ήδη exposed `fetchData`) μετά από κάθε save.

2. **Επεξεργασία**: `src/components/topbar/WorkDayClock.tsx`
   - Wrapping του υπάρχοντος `<div className="flex items-center gap-1 font-mono ...">` (γραμμές 70-76) με το νέο `<WorkDayClockPopover>` μετατρέποντάς το σε `<button>` (cursor-pointer, hover state).
   - Το block `Start/End Day button` παραμένει ως έχει — διαθέσιμο και μέσα στο popover ως duplicate quick action.
   - Όταν `!isClockedIn`, το popover δεν ενεργοποιείται (το νούμερο δεν φαίνεται έτσι κι αλλιώς).

3. **Καμία αλλαγή στο `useWorkDay.ts`** — όλα τα μεθοδικά κομμάτια (intervals, state) ξανα-υπολογίζονται αυτόματα όταν αλλάζει το `todayLog` μέσω του `fetchData`.

### Validation rules
- Νέα `clock_in` ώρα: όχι στο μέλλον, όχι πριν από 24h νωρίτερα από τώρα (sanity).
- Ημερήσιος στόχος: `0.5 ≤ hours ≤ 16`.
- Όλα τα errors → `toast.error` με ξεκάθαρο μήνυμα.

### Modified files
- `src/components/topbar/WorkDayClockPopover.tsx` (new)
- `src/components/topbar/WorkDayClock.tsx` (wrap timer span με trigger)

### Αναμενόμενο αποτέλεσμα
Πατώντας στο `03:44:56 / 8ω` ανοίγει popover όπου ο χρήστης βλέπει σύνοψη ημέρας, μπορεί να διορθώσει την ώρα έναρξης (αν π.χ. ξέχασε να κάνει manual clock-in) και να αλλάξει τον ημερήσιο στόχο ωρών — είτε μόνο για σήμερα είτε μόνιμα για τη συγκεκριμένη ημέρα της εβδομάδας.

