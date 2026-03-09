

# Fixes: Avatar στον πίνακα, Timer στο TopBar, Time entries στο Task Detail, Gantt φίλτρα

## 4 αλλαγές

### 1. Avatar στη στήλη Υπεύθυνος (EnhancedInlineEditCell)
**Πρόβλημα**: Η avatar εμφανίζεται μόνο όταν `selectedOption.avatar` υπάρχει. Αν ο χρήστης δεν έχει avatar_url, εμφανίζεται μόνο κείμενο.

**Λύση** στο `src/components/shared/EnhancedInlineEditCell.tsx`:
- Αλλαγή condition: αντί `type === 'avatar-select' && selectedOption.avatar`, χρήση `type === 'avatar-select'` — πάντα εμφάνιση Avatar με fallback (initials).
- Ίδια αλλαγή στο dropdown options list.

### 2. Active Timer στο TopBar
**Λύση** στο `src/components/layout/TopBar.tsx`:
- Εισαγωγή `useTimeTracking` hook
- Ανάμεσα στο WorkDayClock και XPBadge, εμφάνιση compact timer indicator: `⏱ 01:23:45 [■]` όταν `activeTimer?.is_running`
- Κλικ στο stop button καλεί `stopTimer()`
- Κλικ στο timer text κάνει navigate στο task

### 3. Time Entries πίνακας στο Task Detail (tab Χρόνος)
**Λύση** στο `src/pages/TaskDetail.tsx`:
- Fetch time entries για αυτό το task: `supabase.from('time_entries').select('*').eq('task_id', taskId)`
- Κάτω από τα estimated/actual hours, εμφάνιση πίνακα: Ημ/νία | Διάρκεια | Σημείωση | Χρήστης
- Compact table με τα ίδια styles του υπόλοιπου UI

### 4. Φίλτρα στο Gantt view
**Λύση** στο `src/components/tasks/TaskGanttView.tsx`:
- Προσθήκη props: `statusFilter`, `priorityFilter`, `projectFilter` (ίδια με τα Tasks page)
- Στο controls bar: dropdown φίλτρα για Status, Priority, Project (reuse τα ίδια options)
- Φιλτράρισμα εφαρμόζεται πριν το grouping

**Inline editing στο Gantt**: Drag-to-resize bars αλλάζει start/due dates (mousedown on edges), κλικ στο bar ανοίγει popover με inline edit fields (status, dates, assignee).

---

## Αρχεία

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/components/shared/EnhancedInlineEditCell.tsx` | Avatar fallback πάντα (lines 165, 191) |
| `src/components/layout/TopBar.tsx` | Active timer indicator με stop button |
| `src/pages/TaskDetail.tsx` | Time entries table στο tab Χρόνος |
| `src/components/tasks/TaskGanttView.tsx` | Φίλτρα + inline edit popover + drag resize |

