

# Fix Layout — TopBar Full Width + Sidebar Full Height

## Problem

Μετά την αλλαγή layout, η TopBar δεν πιάνει όλο το εύρος (λείπει δεξιά), και το sidebar rail κόβεται. Η τρέχουσα δομή είναι:

```text
┌─────────────────────────────┐
│ TopBar (full width)         │
├────┬────────────────┬───────┤
│Side│ Content        │ Right │
│bar │                │ Panel │
└────┴────────────────┴───────┘
```

Το πρόβλημα: η TopBar πρέπει να πιάνει **ακριβώς** το εύρος μεταξύ sidebar και right panel, αφήνοντας sidebar + right panel σε πλήρες ύψος. Η σωστή δομή:

```text
┌────┬────────────────┬───────┐
│    │ TopBar         │       │
│Side├────────────────┤ Right │
│bar │ Content        │ Panel │
│    │                │       │
└────┴────────────────┴───────┘
```

## Fix

### `src/components/layout/AppLayout.tsx`

Επαναφορά σε horizontal-first layout: Sidebar | (TopBar + Content) | RightPanel

- Αλλαγή root container πίσω σε `flex flex-row h-screen`
- Sidebar στο αριστερό column (full height)
- Middle column: `flex flex-col` → TopBar + Content
- Right panel στο δεξί column (full height)
- Αυτό εξασφαλίζει ότι sidebar rail φαίνεται πλήρες, TopBar πιάνει ακριβώς τον χώρο content, και right panel δεν κόβεται

### Αλλαγές

| File | Change |
|------|--------|
| `src/components/layout/AppLayout.tsx` | Restructure: sidebar + (topbar/content column) + right panel as 3 horizontal siblings |

