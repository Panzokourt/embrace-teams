## Στόχος

Να μετατρέψουμε το μικρό avatar dropdown κάτω-αριστερά σε ένα πλήρες "user hub" menu, εμπνευσμένο από το ClickUp screenshot, με τις πιο χρήσιμες λειτουργίες ένα κλικ μακριά.

## 1) Κλικ στο όνομα → Προφίλ χρήστη

Στο header του dropdown (avatar + όνομα + email) θα γίνει clickable button που κάνει navigate στο `/hr/employee/{user.id}`. Hover state για να φαίνεται ότι είναι clickable, και ένα μικρό chevron δεξιά.

## 2) Νέα δομή του μενού

Οργανωμένο σε 4 ομάδες με separators:

```text
┌─────────────────────────────────────┐
│ [Avatar] Pantelis Kourtidis      ›  │  ← κλικ → Profile
│          koupant@gmail.com          │
│          ● Online                   │
├─────────────────────────────────────┤
│ 😊  Set status                      │  ← presence + custom emoji status
│ 🔕  Mute notifications          ›   │  ← submenu (15min/1h/Today/Always)
├─────────────────────────────────────┤
│ ⚙️   Ρυθμίσεις                      │  → /settings
│ 🎨  Themes                       ›  │  ← submenu (Light/Dark/System)
│ ⌨️   Keyboard shortcuts             │  ← άνοιγμα shortcut cheatsheet dialog
│ ❓  Βοήθεια & Feedback              │
├─────────────────────────────────────┤
│ Personal Tools                      │  ← group label
│ ✓+  Νέο task                        │  ← άνοιγμα του υπάρχοντος TaskSidePanel
│ 💼  My Work                         │  → /
│ ⏱️   Track time                     │  → /timesheets
│ 📝  Notepad / Quick notes           │  → /  (quick notes section)
│ 🔔  Νέα υπενθύμιση                  │
│ 📅  Calendar                        │  → /calendar
│ 👥  Ομάδα                            │  → /users
├─────────────────────────────────────┤
│ 🏢  Εναλλαγή workspace          ›   │  ← (αν υπάρχουν >1 companies)
│ [→  Αποσύνδεση                      │  ← παραμένει destructive style
└─────────────────────────────────────┘
```

### Λεπτομέρειες ανά item

- **Set status**: Inline picker με 5 emoji presets (🟢 Available, 🍔 Lunch, 🎯 Focus, 🤒 Sick, 🏖️ OOO) + "Clear status". Αποθηκεύεται στο `profiles.work_status` / νέο `status_text` (χρησιμοποιούμε το υπάρχον `work_status` field που ήδη ενημερώνεται στο signOut).
- **Mute notifications**: Submenu με χρονικά διαστήματα. Αποθηκεύεται σε localStorage (`notifications.mutedUntil`) — μη-destructive προσθήκη, χωρίς νέο migration.
- **Themes**: Light / Dark / System (χρησιμοποιεί το υπάρχον `useTheme`).
- **Keyboard shortcuts**: Ανοίγει dialog με τα ήδη υπάρχοντα shortcuts (⌘K, ⌘I, ⌘J κλπ.) — μία στατική λίστα.
- **Workspace switcher**: Εμφανίζεται μόνο αν `allCompanies.length > 1`, με checkmark στο active.
- **Quick actions** (Νέο task / Reminder κλπ.): Reuse υπάρχοντα dialogs/sheets όπου υπάρχουν, αλλιώς απλό navigation.

## 3) Visual & UX

- Πλάτος dropdown: από `w-56` → `w-72` για περισσότερο χώρο.
- Group labels (`Personal Tools`) με `text-xs uppercase text-muted-foreground`.
- Κάθε item με icon 16px αριστερά, label, και προαιρετικό shortcut hint δεξιά (π.χ. `⌘,` για Settings).
- Hover στο header: ελαφρύ background highlight + cursor pointer.
- Online indicator (πράσινη κουκίδα) πάνω στο avatar του header βασισμένο στο `work_status`.
- Διατηρείται το ίδιο rounded/shadow style με τα υπόλοιπα dropdowns της εφαρμογής.

## 4) Τι ΔΕΝ προσθέτουμε (από το ClickUp)

- "Download app" / "Record clip" / "AI Notetaker" / "Whiteboard" — δεν υπάρχουν στην εφαρμογή.
- "Trash" — δεν έχουμε global trash module ακόμα.

## Τεχνικές αλλαγές

- **Νέο component**: `src/components/layout/UserAvatarMenu.tsx` — encapsulates όλο το dropdown για καθαρότητα (το `AppSidebar.tsx` είναι ήδη μεγάλο).
- **Νέο component**: `src/components/layout/KeyboardShortcutsDialog.tsx` — απλός static cheatsheet.
- **Edit**: `src/components/layout/AppSidebar.tsx` lines 482-516 → αντικατάσταση του inline DropdownMenu με `<UserAvatarMenu />`.
- **State**: Status picker → update `profiles.work_status` μέσω supabase. Mute → localStorage key.
- **Routing**: `useNavigate` για profile (`/hr/employee/${user.id}`), settings, calendar, etc.

## Παραδοτέα

1. Κλικ στο header του menu → πάει στο profile του χρήστη.
2. Set status με emoji presets + clear.
3. Mute notifications submenu.
4. Themes submenu (Light/Dark/System) — αντικαθιστά το standalone moon button (προαιρετικά: το αφήνουμε και εκεί για ταχύτητα, ή το αφαιρούμε για να μην διπλασιάζεται).
5. Settings, Keyboard shortcuts, Help.
6. Personal Tools group με quick navigation.
7. Workspace switcher (conditional).
8. Logout (αμετάβλητο).

## Ερώτηση πριν προχωρήσουμε

Το standalone **Moon (theme toggle) button** στο rail πάνω από το avatar — να το **αφαιρέσουμε** τώρα που το theme μπαίνει στο menu, ή να **παραμείνει** για one-click toggle; (Default πρόταση: να παραμείνει — είναι πιο γρήγορο.)