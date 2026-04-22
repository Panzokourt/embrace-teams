

## Πάντα ορατό οριζόντιο scroll στους πίνακες

### Στόχος
Όταν ένας πίνακας ξεπερνά το πλάτος της οθόνης, ο χρήστης να μπορεί να κάνει scroll οριζόντια **χωρίς να κατεβαίνει στο τέλος της σελίδας** για να βρει το native scrollbar.

### Λύση: Sticky horizontal scrollbar (διπλή προσέγγιση)

Θα προσθέσω **δύο μηχανισμούς** που λειτουργούν συμπληρωματικά:

**1. Sticky native scrollbar στο κάτω μέρος του viewport**
Ένα νέο component `<StickyHorizontalScroll>` που:
- Τυλίγει τον πίνακα και παρακολουθεί το scroll position του.
- Όταν ο πίνακας έχει overflow ΚΑΙ το κάτω άκρο του είναι εκτός viewport, εμφανίζει ένα μικρό **sticky scrollbar** καρφιτσωμένο στο κάτω μέρος της οθόνης (position: sticky, bottom: 0) που είναι συγχρονισμένο με το πραγματικό scroll του πίνακα.
- Όταν φτάσεις στο τέλος του πίνακα, ο sticky scrollbar εξαφανίζεται (το native αναλαμβάνει).

**2. Κουμπιά πλοήγησης δεξιά/αριστερά στο header του πίνακα**
Στον toolbar πάνω από κάθε πίνακα (δίπλα στα Views/Group/Columns/Export), θα προστεθούν δύο μικρά κουμπιά `‹ ›`:
- Εμφανίζονται μόνο αν υπάρχει οριζόντιο overflow.
- Κάθε click κάνει smooth scroll κατά ~300px δεξιά/αριστερά.
- Το αριστερό disabled όταν είσαι στην αρχή, το δεξί όταν είσαι στο τέλος.

### Αρχιτεκτονική

**Νέο component**: `src/components/shared/StickyHorizontalScroll.tsx`
- Wrapper γύρω από το `<div className="overflow-x-auto">`.
- Χρησιμοποιεί `IntersectionObserver` για να ξέρει αν το κάτω άκρο φαίνεται.
- Χρησιμοποιεί `ResizeObserver` για να ξέρει αν χρειάζεται scrollbar.
- Render ενός fixed-position proxy scrollbar στο bottom του viewport, συγχρονισμένο μέσω `scrollLeft` listeners (αμφίδρομα).
- Expose ref που επιτρέπει `scrollBy({ left, behavior: 'smooth' })`.

**Νέο component**: `src/components/shared/HorizontalScrollButtons.tsx`
- Δέχεται ref στο scroll container.
- Render δύο `<Button>` με `ChevronLeft` / `ChevronRight`.
- Tracks `scrollLeft`, `scrollWidth`, `clientWidth` για enable/disable state.

**Integration**:
Αντικατάσταση του απλού `<div className="overflow-x-auto">` με το νέο pattern σε:
- `ClientsTableView.tsx`
- `ProjectsTableView.tsx`
- `TasksTableView.tsx`
- `TendersTableView.tsx`
- `ContactsTableView.tsx`
- `UsersTableView.tsx` (HR)

```tsx
// Πριν
<div className="rounded-md border overflow-x-auto">
  <Table style={{ width: totalWidth, tableLayout: 'fixed' }}>...</Table>
</div>

// Μετά
<StickyHorizontalScroll ref={scrollRef} className="rounded-md border">
  <Table style={{ width: totalWidth, tableLayout: 'fixed' }}>...</Table>
</StickyHorizontalScroll>

// Στον toolbar
<HorizontalScrollButtons containerRef={scrollRef} />
```

### Τεχνικές λεπτομέρειες
- Ο sticky scrollbar θα είναι **12px ύψος**, με thumb styling που ταιριάζει στο theme (subtle border, hover state).
- Z-index υψηλό αλλά κάτω από modals/dropdowns (`z-30`).
- Hidden όταν το ποντίκι είναι έξω από το page-shell (avoid clutter στο dashboard view).
- Οι IntersectionObserver/ResizeObserver καθαρίζονται σωστά στο unmount.
- Compatible με τα DndContext wrappers που ήδη υπάρχουν.

### Modified Files
- `src/components/shared/StickyHorizontalScroll.tsx` (new)
- `src/components/shared/HorizontalScrollButtons.tsx` (new)
- `src/components/clients/ClientsTableView.tsx`
- `src/components/projects/ProjectsTableView.tsx`
- `src/components/tasks/TasksTableView.tsx`
- `src/components/tenders/TendersTableView.tsx`
- `src/components/contacts/ContactsTableView.tsx`
- `src/components/users/UsersTableView.tsx`

