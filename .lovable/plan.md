
# Work Mode v2 — 2-Column Layout & AI στο Control Bar

## Στόχος
1. Να εκμεταλλευτούμε το πλάτος (1845px viewport) χωρίζοντας τα sections του τρέχοντος task σε **2 οργανωμένες στήλες**.
2. Να μετακινήσουμε το **Ask AI** από floating button στο **bottom control bar** (δίπλα στο time tracking).
3. Το **Up Next sidebar** δεξιά παραμένει ακριβώς όπως είναι (resizable).

---

## 1. `src/components/focus/FocusOverlay.tsx` — Refactor σε 2 στήλες

### Αλλαγή container (γραμμή 240–242)
Από:
```tsx
<div className="flex-1 overflow-y-auto p-8 pb-32">
  {currentTask ? (
    <div className="max-w-3xl mx-auto space-y-6">
```
Σε:
```tsx
<div className="flex-1 overflow-y-auto px-8 py-8 pb-32">
  {currentTask ? (
    <div className="max-w-[1400px] mx-auto space-y-6">
```

### Header (παραμένει full-width στο top)
- Project name + τίτλος + priority/status selectors **παραμένουν full-width** πάνω από τις 2 στήλες (γραμμές 244–305).

### Νέο 2-column grid κάτω από το header
Αντικατάσταση των γραμμών 307–416 (όλα τα `<Section>` και sections) με:

```tsx
<div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-6">
  {/* LEFT — Core work content */}
  <div className="space-y-6 min-w-0">
    {/* Description */}
    <Section icon={FileText} title="Περιγραφή"> ... </Section>
    {/* Subtasks */}
    <FocusSubtasksSection ... />
    {/* Files */}
    <FocusFilesSection ... />
    {/* Comments (συζήτηση κοντά στο περιεχόμενο) */}
    <FocusCommentsSection taskId={currentTask.id} />
  </div>

  {/* RIGHT — Metadata & tracking */}
  <div className="space-y-6 min-w-0">
    {/* Λεπτομέρειες (assignee, dates, hours, progress) */}
    <Section icon={Clock} title="Λεπτομέρειες"> ... </Section>
    {/* Time tracking */}
    <FocusTimeTrackingSection ... />
    {/* Dependencies */}
    <FocusDependenciesSection taskId={currentTask.id} />
  </div>
</div>
```

**Κατανομή — Λογική:**
- **Αριστερή στήλη (1.15fr — λίγο πιο φαρδιά):** Περιγραφή, Subtasks, Files, Comments → ό,τι χρειάζεται περισσότερο πλάτος για ανάγνωση/γραφή/grids.
- **Δεξιά στήλη (1fr):** Λεπτομέρειες task, Time tracking, Dependencies → metadata, μικρότερα στοιχεία.

**Responsive:** σε `<xl` (κάτω από 1280px) πέφτει σε 1 στήλη (`grid-cols-1`).

### Τα grid του "Λεπτομέρειες" παραμένουν 2-col εσωτερικά
Το `grid-cols-2` (γραμμή 324) μέσα στο Λεπτομέρειες δουλεύει μια χαρά και στη μικρότερη δεξιά στήλη.

---

## 2. `src/components/focus/FocusControlBar.tsx` — Προσθήκη "Ask AI" button

### Νέο prop
```tsx
interface Props {
  onAskAI?: () => void;
}
export default function FocusControlBar({ onAskAI }: Props) { ... }
```

### Νέο button (μετά το Skip button, πριν τα time displays)
```tsx
{onAskAI && (
  <button
    onClick={onAskAI}
    className="h-10 px-4 rounded-full bg-[#3b82f6]/15 hover:bg-[#3b82f6]/25 border border-[#3b82f6]/30 text-[#3b82f6] flex items-center gap-2 transition-all hover:scale-105"
    title="Ask AI για αυτό το task (/)"
  >
    <Sparkles className="h-4 w-4" />
    <span className="text-xs font-medium">Ask AI</span>
  </button>
)}
```

Import `Sparkles` από `lucide-react`.

---

## 3. `src/components/focus/FocusAIChat.tsx` — Reposition + κρύψιμο του floating button

### Αλλαγές
1. **Αφαίρεση του floating launcher** (γραμμές 152–164: το `if (!open) return <button …>`):
   - Όταν `!open` → return `null`. Το άνοιγμα γίνεται αποκλειστικά μέσω του imperative ref (`open()` / `focusInput()`) από το control bar.
2. **Reposition του chat panel** (γραμμή 167):
   ```tsx
   // Από:
   <div className="fixed bottom-6 right-6 z-[58] w-[400px] h-[560px] ...">
   // Σε:
   <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[58] w-[440px] h-[560px] bg-[#161b25] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-fade-in">
   ```
   → εμφανίζεται κεντραρισμένο πάνω από το bottom control bar (που είναι σε `bottom-8`, οπότε `bottom-28` αφήνει αέρα).

---

## 4. `src/components/focus/FocusOverlay.tsx` — Wiring του Ask AI

### Αλλαγή στη render του `<FocusControlBar />` (γραμμή 467)
```tsx
<FocusControlBar onAskAI={() => aiChatRef.current?.open()} />
```

Το `aiChatRef` ήδη υπάρχει (γραμμή 145) και χρησιμοποιείται και από το keyboard shortcut `/`.

---

## Files to be Edited
- `src/components/focus/FocusOverlay.tsx` — 2-column layout, max-width 1400px, wiring `onAskAI`.
- `src/components/focus/FocusControlBar.tsx` — νέο `Ask AI` button + `onAskAI` prop.
- `src/components/focus/FocusAIChat.tsx` — αφαίρεση floating launcher, reposition του panel πάνω από το control bar.

## Files NOT Touched
- `FocusSidebarResizer.tsx`, `FocusKeyboardShortcuts.tsx`, όλα τα sections (`FocusSubtasksSection`, `FocusFilesSection`, κλπ) — δουλεύουν χωρίς αλλαγή στο νέο grid.
- `FocusContext.tsx` — όλη η business logic παραμένει.

## Επαληθεύσεις μετά την υλοποίηση
1. Στα 1845px viewport: 2 στήλες ορατές, `Up Next` sidebar δεξιά, αέρας 6 (24px) μεταξύ στηλών.
2. Στα <1280px: collapse σε 1 στήλη όπως πριν.
3. Click στο `Ask AI` button στο control bar → ανοίγει το chat panel πάνω από το bar.
4. Πατώντας `/` (keyboard shortcut) → ίδια συμπεριφορά.
5. Δεν υπάρχει πλέον το floating "Ask AI" button κάτω-δεξιά.
