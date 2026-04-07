
# Task Sidebar — Docked Panel αντί Modal Sheet

## Πρόβλημα
Τώρα, όταν πατάς ένα task στα "Tasks Σήμερα", ανοίγει ένα `Sheet` (modal overlay) που κάνει blur το background και δεν αφήνει αλληλεπίδραση με την υπόλοιπη σελίδα. Δείχνει επίσης πολύ λίγη πληροφορία και τίποτα δεν είναι editable ή clickable.

## Λύση
Αντικατάσταση του `Sheet` με ένα **docked sidebar panel** στα δεξιά, που:
- Σπρώχνει (resize) το υπόλοιπο content αντί να κάνει overlay/blur
- Δείχνει πλήρη πληροφορία του task με inline editing
- Έχει clickable links (project, client, assignee)

## Αλλαγές

### 1. Αντικατάσταση Sheet → Docked Panel (`MyWork.tsx`)
- Αφαίρεση του `<Sheet>` component
- Προσθήκη ενός `<div>` sidebar panel στα δεξιά, conditional render βάσει `selectedItem`
- Το main content γίνεται `flex-1` και ο panel `w-[420px] shrink-0` — push layout, χωρίς blur
- Animation: slide-in από δεξιά (`animate-in slide-in-from-right`)

### 2. Νέο component `TaskSidePanel.tsx`
Πλούσιο panel με:
- **Header**: Τίτλος task (editable), X button για κλείσιμο
- **Clickable links**: Project name → `/projects/:id`, Client name → `/clients/:id`, Assignee name → profile
- **Inline editing**: Status (dropdown), Priority (dropdown), Due date (calendar popover), Start date, Progress (slider), Description (textarea)
- **Timer**: Start/Stop button
- **Subtasks**: Compact list αν υπάρχουν
- **Footer**: "Άνοιγμα σελίδας Task" button

### 3. Layout restructure
```text
BEFORE:
┌─────────────── full width ───────────────┐
│ MyWork content                           │
│                        ┌──── Sheet ────┐ │
│     (blurred)          │  Task info    │ │
│                        └───────────────┘ │
└──────────────────────────────────────────┘

AFTER:
┌──── flex-1 ────┬──── w-[420px] ────┐
│ MyWork content │  Task Side Panel  │
│ (interactive)  │  (editable info)  │
│                │  - Status ✏️       │
│                │  - Project 🔗     │
│                │  - Date ✏️        │
│                │  - Timer ▶️       │
└────────────────┴───────────────────┘
```

## Technical Details
- Fetch full task data (with project.client, assignee profile) when panel opens, using task ID from the clicked item
- Updates via `supabase.from('tasks').update(...)` — same pattern as TaskDetail page
- Status/Priority use the existing `STATUS_COLORS`/`PRIORITY_COLORS` configs
- Clickable elements use `<Link>` from react-router-dom
- Panel closes on X click or Escape key
- `DeliverableDetailSheet` also moves into the same docked panel pattern

## Files

| File | Change |
|------|--------|
| `src/components/my-work/TaskSidePanel.tsx` | New — rich, editable docked task panel with clickable links |
| `src/pages/MyWork.tsx` | Replace `Sheet` with docked side panel layout, flex container |
