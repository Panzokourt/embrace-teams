
# Timesheets — Ξεχωριστή Σελίδα με Προηγμένες Προβολές

## Επισκόπηση

Αφαίρεση του Timesheets tab από το HR και δημιουργία αυτόνομης σελίδας `/timesheets` με:
- Weekly grid view (σαν την εικόνα αναφοράς) — tasks σε γραμμές, ημέρες σε στήλες
- List view (βελτιωμένη τρέχουσα)
- Φίλτρα ανά χρονικό διάστημα (προεπιλογές + custom range)
- Ομαδοποίηση ανά έργο, άτομο, task, status
- Inline editing καταχωρήσεων
- Navbar link για Timesheets

---

## 1. Routing & Navigation

### App.tsx
- Αλλαγή: `/timesheets` δείχνει σε `<Timesheets />` αντί για redirect στο HR
- Αφαίρεση του redirect `/timesheets -> /hr?tab=timesheets`

### HR.tsx
- Αφαίρεση του Timesheets tab και του `TimesheetsContent` wrapper
- Αφαίρεση του import `TimesheetsPage`

### AppSidebar.tsx
- Προσθήκη νέου nav item: `{ title: 'Timesheets', href: '/timesheets', icon: Timer }`

---

## 2. Weekly Grid View (Timesheet View)

Νέο section στη σελίδα Timesheets, όπως η εικόνα αναφοράς:

```text
< >  Φεβ 16 – Φεβ 22  v

Task / Location          | Δευ 16 | Τρι 17 | Τετ 18 | Πεμ 19 | Παρ 20 | Σαβ 21 | Κυρ 22 | Total
─────────────────────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼──────
Digitalisation           |   —    | 2h 44m | 1h 21m | 8h 55m | 4h 9m  |   —    |   —    | 17h 11m
  On Going / Project X   |        |        |        |        |        |        |        |
Audit Accounts           |   —    | 3h 17m | 6h 18m |   —    |   —    |   —    |   —    | 9h 35m
  Open / Project Y       |        |        |        |        |        |        |        |
```

- Γραμμές = tasks (ομαδοποιημένα ανά project)
- Στήλες = ημέρες της εβδομάδας
- Κάθε κελί = σύνολο χρόνου για task+ημέρα
- Click σε κελί = inline edit ή popover για προσθήκη/επεξεργασία χρόνου
- Header στηλών: ημέρα + σύνολο ωρών ημέρας
- Τελευταία στήλη: Total ανά task
- Color bar στο header ανά ημέρα (progress indicator)
- Play button ανά task row για εκκίνηση timer
- Πλοήγηση εβδομάδας με < > βελάκια

---

## 3. Φίλτρα & Χρονικό Διάστημα

### Προεπιλογές
- Σήμερα, Αυτή την εβδομάδα, Αυτόν τον μήνα, Προηγούμενη εβδομάδα, Προηγούμενος μήνας

### Custom Range
- Date range picker (από - έως) για ελεύθερη επιλογή

### Ομαδοποίηση (Group By)
- Ανά Έργο (default)
- Ανά Άτομο
- Ανά Task
- Ανά Status

### Φίλτρα
- Έργο (dropdown)
- Άτομο (dropdown, μόνο admin/manager)
- Status (todo, in_progress, done, κλπ)

---

## 4. View Toggle

Δύο προβολές με toggle:
- **Timesheet** (weekly grid) — η κύρια, σαν την εικόνα
- **Time Entries** (list) — η βελτιωμένη τρέχουσα λίστα

---

## 5. Inline Editing

Στη list view, κάθε καταχώρηση θα υποστηρίζει inline edit:
- Ώρα έναρξης / λήξης
- Σημειώσεις (description)
- Task assignment
- Project

Στη timesheet (grid) view:
- Click σε κελί ανοίγει popover για edit/add χρόνο

---

## Αρχεία που Αλλάζουν

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/pages/Timesheets.tsx` | **Rewrite** — Νέα σελίδα με view toggle, grid view, filters |
| `src/pages/HR.tsx` | Αφαίρεση timesheets tab |
| `src/App.tsx` | Route `/timesheets` -> `<Timesheets />` αντί redirect |
| `src/components/layout/AppSidebar.tsx` | Νέο nav item Timesheets |
| `src/components/time-tracking/TimesheetGridView.tsx` | **Νέο** — Weekly grid component |
| `src/components/time-tracking/TimesheetFilters.tsx` | **Νέο** — Filters & date range |
| `src/components/time-tracking/TimeEntriesListView.tsx` | **Νέο** — Βελτιωμένη list view με inline edit |

---

## Τεχνικές Σημειώσεις

- Τα δεδομένα φορτώνονται από τον πίνακα `time_entries` με joins σε `tasks`, `projects`, `profiles`
- Η grid view υπολογίζει aggregates client-side (group by task+day)
- Inline edit χρησιμοποιεί το υπάρχον `EnhancedInlineEditCell` component
- Realtime subscription για live updates παραμένει
- Export CSV/Excel παραμένει
- Η σελίδα δεν απαιτεί database migration — χρησιμοποιεί τους υπάρχοντες πίνακες
