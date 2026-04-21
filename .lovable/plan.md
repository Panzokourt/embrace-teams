

## Στόχος

Τρεις βελτιώσεις στην καρτέλα πελάτη (`/clients/:id`):

1. Κουμπιά γρήγορης δημιουργίας μέσα σε sections (Projects, Briefs, Contacts, Media Plans, Files).
2. Drag-and-drop για αναδιάταξη και απόκρυψη/εμφάνιση sections με persistence.
3. Νέο "Stats Strip" με cards αμέσως κάτω από το header (Έσοδα, Μηνιαία, Margin, P&L μετρικές, Tasks snapshot).

## 1. Κουμπιά δημιουργίας ανά section

Προσθήκη `+` button στο header κάθε section, που δείχνει στο ίδιο route δημιουργίας με pre-filled `client_id`:

- **Projects** → `/projects?new=true&client={id}` (ήδη υποστηρίζεται από το Smart Header dropdown)
- **Briefs** → υπάρχει ήδη
- **Contacts** → `/contacts?new=true&client={id}`
- **Media Plans** → `/media-planning?new=true&client={id}`
- **Files** → trigger upload dialog του ClientFilesCard

Ομοιόμορφο styling: `Button size="sm" variant="outline" h-7` με `Plus` icon, ακριβώς όπως στο `ClientBriefsCard`.

## 2. Draggable / Hideable sections

### Νέο hook `useClientDetailLayout`

`src/hooks/useClientDetailLayout.ts` — βασισμένο στο pattern του `useDashboardConfig`:

```ts
interface SectionConfig { id: string; visible: boolean; column: 'left' | 'right'; }
const STORAGE_KEY = 'client_detail_layout_v1';
```

Default sections:
- **Left**: `business_info`, `websites`, `social`, `ad_accounts`, `strategy`
- **Right**: `pl_summary`, `projects`, `media_plans`, `tasks_snapshot`, `briefs`, `team`, `contacts`

Persistence per-user στο `localStorage` (απλό, ίδιο pattern με dashboard).

### Νέο component `DraggableSection`

`src/components/clients/detail/DraggableSection.tsx`:
- Wrap κάθε card.
- Drag handle (`GripVertical`) + κουμπί "Hide" (`EyeOff`) εμφανίζονται on hover πάνω-δεξιά της κάρτας.
- Χρήση `@dnd-kit/sortable` (`useSortable`) όπως το `WidgetWrapper.tsx`.
- Σταθερό layout χωρίς αλλαγή visual style των υπαρχόντων cards.

### Layout management UI

Νέο dropdown κουμπί "Layout" στο `ClientSmartHeader` (δεξιά, δίπλα στο "Πλήρης"):
- Λίστα όλων των sections με toggle visibility (checkbox).
- Επιλογή "Επαναφορά διάταξης".

### DnD wiring στο `ClientDetail.tsx`

- `DndContext` + `SortableContext` ανά στήλη (left/right) χρησιμοποιώντας τον υπάρχοντα `DroppableColumn` pattern.
- Drag μεταξύ στηλών επιτρέπεται (cross-column move).
- `onDragEnd` ενημερώνει το layout μέσω hook.

## 3. Stats Strip κάτω από τον header

Νέο component `ClientStatsStrip` (`src/components/clients/detail/ClientStatsStrip.tsx`):

```text
[Έσοδα Έτους] [Μηνιαία] [Margin %] [Τιμολογημένα] [Εισπραγμένα] [Ανεξόφλητα] [Overdue Tasks] [This Week] [Open]
```

- Grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-9 gap-3`.
- Style βασισμένο στο `EmployeeStatsCard` (icon-circle αριστερά, value/label δεξιά, color variants: `primary`, `success`, `warning`, `destructive`).
- Compact ύψος για να μην καταλαμβάνει πολύ vertical space.

### Συνέπειες σε άλλα cards

- Από `ClientSmartHeader`: αφαιρούνται οι 3 KPIs δεξιά (Έσοδα/Μηνιαία/Margin) — μετακινούνται στο strip.
- `ClientPLSummary`: παραμένει ως card στο right column, αλλά το νέο strip δείχνει τα ίδια metrics σε compact form. Αν θέλει ο χρήστης, μπορεί να το κρύψει από το layout panel (σύσταση: το strip είναι quick glance, η κάρτα έχει progress bar + collection rate).
- `ClientTasksSnapshot`: ομοίως παραμένει στο right column για περισσότερες λεπτομέρειες.

## Αρχεία που θα αλλάξουν

**Νέα:**
- `src/hooks/useClientDetailLayout.ts`
- `src/components/clients/detail/DraggableSection.tsx`
- `src/components/clients/detail/ClientStatsStrip.tsx`
- `src/components/clients/detail/ClientLayoutMenu.tsx` (dropdown για visibility/reset)

**Τροποποιήσεις:**
- `src/pages/ClientDetail.tsx` — DndContext, νέο stats strip, dynamic section rendering μέσω layout config.
- `src/components/clients/detail/ClientSmartHeader.tsx` — αφαίρεση των 3 KPIs, προσθήκη `ClientLayoutMenu`.
- `src/components/clients/detail/ClientProjectsCard.tsx` — νέο `+ New Project` button στο header.
- `src/components/clients/detail/ClientContactsCard.tsx` — νέο `+ New Contact` button.
- `src/components/clients/detail/ClientMediaPlansCard.tsx` — header redesign (CardHeader/CardTitle pattern) + `+ New Plan` button.
- `src/components/clients/detail/ClientFilesCard.tsx` — `+ Upload` button.

## Τι ΔΕΝ αλλάζει

- DB schema, RLS, edge functions.
- Visual style των υπαρχόντων cards (μόνο header tweaks).
- Inline editing functionality στο header.

## Verification

1. Στο `/clients/:id`, αμέσως κάτω από τον τίτλο εμφανίζεται strip με 9 stat cards.
2. Hover σε κάθε section → εμφανίζεται grip handle + hide icon.
3. Drag section από left στο right column → αποθηκεύεται και επιβιώνει refresh.
4. Layout menu → toggle visibility και reset.
5. Click `+` σε κάθε section → ανοίγει το αντίστοιχο create flow με προ-επιλεγμένο client.
6. Responsive: mobile/tablet δείχνει stats strip σε 2-3 στήλες, sections σε single column (drag παραμένει active).

