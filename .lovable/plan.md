

# Top Bar - Σωστή τοποθέτηση εικονιδίων & Search

## Πρόβλημα
Τα εικονίδια (Activity, Notifications) είναι τοποθετημένα με `absolute` positioning στο top-right του main content area, και συγκρούονται με τα dashboard header buttons (filters, export, settings). Αυτό τα κάνει να πέφτουν το ένα πάνω στο άλλο.

## Λύση
Δημιουργία ενός σταθερού **Top Bar** στο `AppLayout` που θα περιέχει:
- **Αριστερά**: Breadcrumb ή τίτλος σελίδας (κενό, γεμίζει από το content)
- **Κέντρο/Αριστερά**: AI-powered dynamic search bar (Command+K style)
- **Δεξιά**: Activity feed button, Notification bell (τακτοποιημένα σε σειρά)

## Τι αλλάζει

### 1. Νέο component: `TopBar.tsx`
Σταθερό bar στην κορυφή του main content area:
- Sticky top bar (`sticky top-0 z-20`) με glass/blur effect
- Search input στα αριστερά/κέντρο (Command palette style με Cmd+K shortcut)
- Action icons δεξιά: Activity, Notifications
- Responsive: στο mobile κρύβεται το search και μένουν τα icons

### 2. Dynamic Search (AI-powered)
- Input field τύπου command palette
- Αναζητεί σε: projects, tasks, tenders, clients (multi-table search)
- Dropdown results με entity icon + link
- Keyboard shortcut: Cmd+K / Ctrl+K για focus

### 3. Αλλαγές στο `AppLayout.tsx`
- Αφαίρεση των absolute positioned icon divs (desktop + mobile)
- Προσθήκη του `TopBar` component πάνω από το `<Outlet />`
- Αφαίρεση του `pt-16 md:pt-0` padding (γίνεται handled από το TopBar)

### 4. Αλλαγές στο `Dashboard.tsx`
- Δεν χρειάζεται αλλαγή -- τα dashboard-specific controls (filters, export, customizer) μένουν στο dashboard header

## Technical Details

### Νέα αρχεία
- `src/components/layout/TopBar.tsx` - Global top bar με search + actions

### Αλλαγές σε υπάρχοντα
- `src/components/layout/AppLayout.tsx` - Αντικατάσταση absolute icons με TopBar component

### TopBar Layout

```text
+------------------------------------------------------------------+
| [Search icon] Search projects, tasks...  (Cmd+K)  | [Activity] [Bell] |
+------------------------------------------------------------------+
```

- Background: `bg-background/80 backdrop-blur-lg border-b`
- Height: `h-14`
- Search: `cmdk`-style input (το `cmdk` package υπάρχει ήδη στο project)
- Results dropdown: Popover με grouped results (Projects, Tasks, Tenders, Clients)

### Search Implementation
- Χρήση `cmdk` (ήδη installed) μέσα σε Popover
- Multi-table search μέσω Supabase `.ilike()` queries σε: projects.name, tasks.title, tenders.name, clients.name
- Debounced search (300ms)
- Grouped αποτελέσματα με entity icons
- Click result -> navigate to entity page
- Keyboard: Cmd+K focus, Escape close, Arrow keys navigate

### Σειρά υλοποίησης
1. Δημιουργία `TopBar.tsx` (search + action icons)
2. Ενημέρωση `AppLayout.tsx` (αντικατάσταση absolute positioning)

