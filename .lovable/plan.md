

## Γιατί δεν εμφανίζεται το sticky scrollbar / κουμπιά

Βρήκα την αιτία. Το `<Table>` component (`src/components/ui/table.tsx`) τυλίγει το `<table>` σε δικό του wrapper:

```tsx
<div className="relative w-full overflow-auto">
  <table ... />
</div>
```

Αυτό σημαίνει ότι **όλο το οριζόντιο overflow «καταναλώνεται» μέσα στον εσωτερικό wrapper του Table** πριν φτάσει ποτέ στο `StickyHorizontalScroll`. Συνέπεια:

- Το `scrollRef.current.scrollWidth === clientWidth` → `hasOverflow = false` → η floating proxy μπάρα δεν εμφανίζεται ποτέ.
- Ομοίως στο `HorizontalScrollButtons`: `overflow=false` → επιστρέφει `null`, γι' αυτό δεν βλέπεις τα `‹ ›` κουμπιά στον toolbar.

Επιπλέον, ακόμα κι αν διορθωνόταν αυτό, το `<main className="overflow-auto">` στο `AppLayout` σημαίνει ότι η σελίδα κάνει scroll μέσα στο `<main>` και όχι στο window — οπότε ο υπολογισμός «πού είναι το native scrollbar» πρέπει να γίνεται σε σχέση με το `<main>`, όχι το viewport.

## Λύση

### 1. Ουδετεροποίηση του εσωτερικού wrapper του `<Table>` στους reorderable πίνακες

Δύο επιλογές — προτείνω την **(α)** γιατί δεν αγγίζει το shared `Table` και δεν ρισκάρει regressions αλλού:

**(α) Νέο variant του Table χωρίς wrapper.** Στο `src/components/ui/table.tsx` προσθέτω prop `unstyledWrapper?: boolean` (ή νέο export `RawTable`) που παραλείπει το `<div overflow-auto>` και κάνει render απευθείας `<table>`. Οι 6 πίνακες (Projects/Tasks/Tenders/Clients/Contacts/Users) θα το χρησιμοποιήσουν αφού ήδη δίνουν εξωτερικό scroll container (`StickyHorizontalScroll`).

```tsx
// src/components/ui/table.tsx
const Table = React.forwardRef<..., { unstyledWrapper?: boolean } & ...>(
  ({ className, unstyledWrapper, ...props }, ref) => {
    if (unstyledWrapper) {
      return <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />;
    }
    return (
      <div className="relative w-full overflow-auto">
        <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
      </div>
    );
  }
);
```

Σε `ProjectsTableView`/`TasksTableView`/`TendersTableView`/`ClientsTableView`/`ContactsTableView`/`UsersTableView`:
```tsx
<Table unstyledWrapper style={{ width: totalWidth, tableLayout: 'fixed' }}>
```

Έτσι, το οριζόντιο overflow βγαίνει στο `StickyHorizontalScroll` που είναι ο πραγματικός scroll container — και μετράται σωστά.

### 2. Ορθή ανίχνευση scroll container για το «native scrollbar visible»

Το `StickyHorizontalScroll` πρέπει να βρει τον κοντινότερο vertically-scrolling πρόγονο (το `<main>`) και να ακούει scroll εκεί, όχι μόνο στο window:

```tsx
// utility μέσα στο component
function getScrollParent(el: HTMLElement | null): HTMLElement | Window {
  let node = el?.parentElement;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return window;
}
```

Στο update():
```tsx
const scrollParent = getScrollParent(el);
const parentRect = scrollParent === window
  ? { top: 0, bottom: window.innerHeight }
  : (scrollParent as HTMLElement).getBoundingClientRect();
const rect = el.getBoundingClientRect();
setNativeScrollbarVisible(rect.bottom <= parentRect.bottom + 1 && rect.bottom > parentRect.top);
```

Και attach scroll listener στον `scrollParent` αντί για window capture mode.

### 3. Σωστό positioning του floating bar μέσα στο `<main>` περιοχή

Επειδή υπάρχουν sidebar (αριστερά) και πιθανό right panel (δεξιά), το `position: fixed; bottom: 0; left: rect.left; width: rect.width` είναι σωστό (μετράει σε σχέση με το viewport και το rect του πραγματικού scroll container). Διατηρείται ως έχει.

### 4. Force-show toggle για debugging (προαιρετικό)

Προσθέτω ένα prop `alwaysShowProxy?: boolean` στο `StickyHorizontalScroll` ώστε να μπορούμε να κάνουμε γρήγορη επιβεβαίωση στο preview ότι εμφανίζεται. Default `false`.

## Αρχεία προς τροποποίηση

- `src/components/ui/table.tsx` — προσθήκη `unstyledWrapper` prop.
- `src/components/shared/StickyHorizontalScroll.tsx` — `getScrollParent` + scroll listener στον σωστό parent.
- `src/components/shared/HorizontalScrollButtons.tsx` — δεν χρειάζεται αλλαγή· θα δουλέψει αυτόματα μόλις το `StickyHorizontalScroll` αναλάβει το πραγματικό overflow.
- `src/components/projects/ProjectsTableView.tsx` — `<Table unstyledWrapper ...>`.
- `src/components/tasks/TasksTableView.tsx` — `<Table unstyledWrapper ...>`.
- `src/components/tenders/TendersTableView.tsx` — `<Table unstyledWrapper ...>`.
- `src/components/clients/ClientsTableView.tsx` — `<Table unstyledWrapper ...>`.
- `src/components/contacts/ContactsTableView.tsx` — `<Table unstyledWrapper ...>`.
- `src/components/users/UsersTableView.tsx` — `<Table unstyledWrapper ...>`.

## Αναμενόμενο αποτέλεσμα

- Στον πίνακα Έργων (και στους άλλους 5) θα εμφανιστούν ΑΜΕΣΩΣ τα κουμπιά `‹ ›` δίπλα στο «Εξαγωγή», ενεργά όταν υπάρχει overflow.
- Όταν ο πίνακας έχει οριζόντιο overflow και δεν φαίνεται το κάτω μέρος του στο `<main>`, θα εμφανίζεται μια λεπτή sticky scrollbar καρφιτσωμένη στο κάτω μέρος της οθόνης, συγχρονισμένη με τον πίνακα.
- Καμία αλλαγή στη συμπεριφορά άλλων `<Table>` instances (το νέο prop είναι opt-in).

