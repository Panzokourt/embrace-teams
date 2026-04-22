

## Αντικατάσταση Right Panel με Floating Bottom Dock

### Στόχος
Καταργούμε το δεξί side panel (`SecretaryPanel`) και το αντικαθιστούμε με ένα μοντέρνο **floating bottom dock** με icon buttons. Κάθε κουμπί ανοίγει είτε ένα floating popover panel (πάνω από το dock) είτε πηγαίνει σε σελίδα. Το Chat ανοίγει σαν Messenger-style floating window. Το `QuickChatBar` (⌘+I) μετακινείται πάνω από το dock για να μην επικαλύπτονται.

### UI Layout

```text
┌─────────────────────────────────────────────────┐
│  [Sidebar]  │  TopBar                           │
│             ├───────────────────────────────────│
│             │                                   │
│             │       Main Content                │
│             │                                   │
│             │    ┌──────────────────┐           │
│             │    │ Floating Popover │           │
│             │    │ (Secretary/      │           │
│             │    │  Notifications/  │           │
│             │    │  Activity)       │           │
│             │    └──────────────────┘           │
│             │  ┌─────────────────────────────┐  │
│             │  │ QuickChatBar (⌘I) — bottom-24│  │
│             │  └─────────────────────────────┘  │
│             │       ┌──────────────────┐        │
│             │       │ 🤖 🔔 💬 📊 🧠 ⚡│ ← dock │
│             │       └──────────────────┘ bottom-4│
└─────────────────────────────────────────────────┘
```

### Floating Bottom Dock (`FloatingDock.tsx` — νέο)

- **Position**: `fixed bottom-4 left-1/2 -translate-x-1/2 z-50`
- **Style**: Pill-shape `rounded-full`, `backdrop-blur-xl`, `bg-card/80`, soft shadow `shadow-2xl`, `border border-border/40`. Gap-1 μεταξύ items.
- **Icons (6)** — με tooltip + label on hover:
  1. **Secretary** (`Bot`) → opens floating popover με `SecretaryChat mode="panel"`
  2. **Notifications** (`Bell`) → opens floating popover με `NotificationList`. Badge dot αν υπάρχουν unread.
  3. **Activity** (`Activity`) → opens floating popover με `ActivityFeedContent`
  4. **Chat** (`MessageSquare`) → ανοίγει **Messenger-style floating chat window** (βλ. παρακάτω). Badge dot για νέα μηνύματα.
  5. **AI Memory** (`Brain`) → navigates στο `/settings` ή ανοίγει `MemoryManager` σε popover
  6. **Quick AI** (`Sparkles`) → toggles το `QuickChatBar` (⌘+I)
- **Animations**:
  - Mount: `animate-fade-in` + slight slide-up
  - Hover per icon: `hover-scale` + subtle background glow
  - Active item: filled background pill `bg-primary/15 text-primary`, με `transition-all` 200ms
  - Icons με `group-hover:scale-110` και label tooltip που εμφανίζεται με `animate-scale-in`

### Floating Popover Panels

Ένας ενιαίος `<FloatingDockPanel>` wrapper που εμφανίζεται **πάνω** από το dock όταν επιλεγεί ένα από τα Secretary / Notifications / Activity / Memory:

- **Position**: `fixed bottom-20 left-1/2 -translate-x-1/2 z-40`
- **Size**: `w-[420px] h-[560px]` (responsive: στο mobile γίνεται drawer full-width)
- **Style**: `rounded-2xl`, `border`, `shadow-2xl`, `backdrop-blur-xl`, `bg-card/95`
- **Header**: μικρός με τίτλο tab + κουμπί `X` close
- **Content**: render το αντίστοιχο component (`SecretaryChat`, `NotificationList`, `ActivityFeedContent`, `MemoryManager`)
- **Animation**: enter `animate-scale-in` + `animate-fade-in`, exit reverse. Origin: bottom center.
- **Click outside**: το panel **παραμένει ανοιχτό** ώστε ο χρήστης να μπορεί να αλληλεπιδρά με την υπόλοιπη εφαρμογή. Κλείνει μόνο με X ή ξανά click στο dock icon.
- **Backdrop**: ΧΩΡΙΣ overlay/backdrop — non-modal, fully interactive surroundings (Messenger-style).

### Chat — Messenger-style

Το Chat icon δεν ανοίγει popover. Αντί για αυτό:
- Πρώτη φορά → ανοίγει ένα floating **channel picker mini-window** (μικρός pill list με channels + DMs, όπως το `ChatPanelView` αλλά compact) στη θέση του popover.
- Επιλογή καναλιού → χρησιμοποιεί το ήδη υπάρχον `ChatContext.openFloatingWindow()` για να ανοίξει floating bubble (ChatFloatingBubbles ήδη χειρίζεται multiple windows κάτω-δεξιά).
- Έτσι έχουμε ταυτόχρονα ανοιχτά 1-3 chats (Messenger-style) + δυνατότητα αλληλεπίδρασης με την υπόλοιπη app.
- Τα `ChatFloatingBubbles` μετακινούνται στο `bottom-4 right-4` με offset για να **μην επικαλύπτουν** το dock (το dock είναι κεντραρισμένο, τα bubbles δεξιά → ΟΚ).

### Συντονισμός με QuickChatBar (⌘+I)

Το `QuickChatBar` σήμερα είναι `fixed bottom-4`. Με το dock στο `bottom-4`, θα συγκρουστούν.
- Αλλάζω το `QuickChatBar` σε `bottom-20` (~80px πάνω από το dock) ώστε όταν είναι ανοιχτό να κάθεται πάνω από το dock.
- Όταν ανοίγει το `QuickChatBar`, το dock κάνει **slight slide-down** (`translate-y-2 opacity-80`) ή παραμένει σταθερό. Επιλογή: παραμένει σταθερό — ο χρήστης πρέπει να βλέπει και τα δύο.
- Όταν ανοίγει floating popover (π.χ. Secretary), το popover είναι στο `bottom-20`, ίδιο ύψος με το QuickChatBar. **Mutual exclusion**: αν ο χρήστης ανοίξει QuickChatBar ενώ είναι ανοιχτό popover → το popover κλείνει αυτόματα (και αντίστροφα). Διαχειρίζεται μέσα στον `LayoutProvider` ή σε νέο context.

### Αλλαγές στο `AppLayout.tsx`

- Αφαιρώ τα blocks: `showDockedRightPanel`, `showOverlayRightPanel`, `showDrawerRightPanel` και τα resize handles για το right panel.
- Αφαιρώ τις `RIGHT_PANEL_*` σταθερές + το localStorage key.
- Διατηρώ το state `activeTab: RightPanelTab` αλλά το συνδέω με το νέο `<FloatingDock>` (ποιό panel είναι ενεργό).
- Διατηρώ το event `open-secretary-panel` (το χρησιμοποιεί ο VoiceCommandProvider) → ανοίγει το Secretary floating popover αντί για side panel.
- Διατηρώ το ⌘+J shortcut → toggle Secretary popover.

### Αλλαγές στο `TopBar.tsx`

- Αφαιρώ το `PanelRightOpen/Close` toggle button και τα props `onPanelToggle`, `rightPanelOpen` (πλέον δεν χρειάζονται). Το dock είναι αυτόνομο.
- Το `onQuickChatToggle` παραμένει.

### Νέα/Τροποποιημένα αρχεία

- **NEW** `src/components/dock/FloatingDock.tsx` — το pill dock με τα 6 icons, animations, badge dots, internal active state.
- **NEW** `src/components/dock/FloatingDockPanel.tsx` — generic wrapper popover (header + content + animation).
- **NEW** `src/components/dock/DockChatPicker.tsx` — compact channel/DM picker που ανοίγει floating chats μέσω `ChatContext`.
- **NEW** `src/contexts/DockContext.tsx` — διαχειρίζεται `activePanel: 'secretary' | 'notifications' | 'activity' | 'memory' | null` + listener για mutual exclusion με QuickChatBar.
- **EDIT** `src/components/layout/AppLayout.tsx` — αφαίρεση right panel, προσθήκη `<FloatingDock />` + `<FloatingDockPanel />` και `DockProvider`. Mutual-exclusion logic μεταξύ dock panel και QuickChatBar.
- **EDIT** `src/components/layout/TopBar.tsx` — αφαίρεση panel toggle button.
- **EDIT** `src/components/quick-chat/QuickChatBar.tsx` — `bottom-4` → `bottom-20` ώστε να κάθεται πάνω από το dock.
- **EDIT** `src/components/chat/ChatFloatingBubbles.tsx` — confirm bottom positioning (`bottom-0 right-4`) ώστε να μην επικαλύπτει το κεντρικό dock.
- **DELETE-ish** `src/components/secretary/SecretaryPanel.tsx` — δεν διαγράφεται, αλλά δεν χρησιμοποιείται πλέον (το περιεχόμενο σπάει σε επιμέρους components μέσα στο `FloatingDockPanel`).

### Αναμενόμενο αποτέλεσμα

- Το δεξί panel εξαφανίζεται. Όλη η οθόνη πλάτους είναι διαθέσιμη για το main content.
- Στο κάτω-κέντρο εμφανίζεται ένα μοντέρνο floating dock με 6 εικονίδια, με smooth hover animations και labels.
- Click σε Secretary/Notifications/Activity/Memory → ανοίγει ένα ωραίο floating panel πάνω από το dock με `scale-in` animation. Ο χρήστης μπορεί να κλικάρει οπουδήποτε αλλού στην εφαρμογή χωρίς να κλείσει.
- Click σε Chat → ανοίγει mini channel picker, και επιλογή καναλιού → εμφανίζεται Messenger-style floating bubble κάτω-δεξιά (1-3 ταυτόχρονα).
- Click σε Quick AI ή ⌘+I → ανοίγει το `QuickChatBar` 80px πάνω από το dock. Αν ένα popover είναι ήδη ανοιχτό, αυτό κλείνει αυτόματα (και αντίστροφα).
- Όλες οι μεταβάσεις χρησιμοποιούν τα υπάρχοντα tailwind animations (`fade-in`, `scale-in`, `hover-scale`).

