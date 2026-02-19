
# Gantt / Timeline View στην Καρτέλα Έργου

## Τι θα προσθέσουμε

Ένα νέο tab **"Timeline"** στην καρτέλα κάθε έργου που εμφανίζει tasks και deliverables σε Gantt chart — οριζόντιες μπάρες σε χρονολογικό άξονα, χωρισμένες ανά Deliverable (grouping).

Δεν χρειάζεται εξωτερική βιβλιοθήκη Gantt — θα υλοποιηθεί **custom με pure CSS/Tailwind + Recharts** (ήδη εγκατεστημένο) χρησιμοποιώντας `recharts` για το χρονολογικό άξονα και SVG bars για τα items.

---

## Αρχιτεκτονική Gantt (Pure Custom — χωρίς εξωτερική βιβλιοθήκη)

Το Gantt θα είναι ένα **scrollable grid** με:

- **Αριστερά (fixed, ~240px)**: Λίστα με όνομα task/deliverable + badge κατάστασης
- **Δεξιά (scrollable)**: Οριζόντιο grid ημερών/εβδομάδων με μπάρες

```text
┌──────────────────────────┬────────────────────────────────────────────────┐
│  ΕΡΓΑΣΙΑ / ΠΑΡΑΔΟΤΕΟ     │  Ιαν │ Φεβ │ Μαρ │ Απρ │ Μαι │ Ιουν │ ...  │
├──────────────────────────┼────────────────────────────────────────────────┤
│  📦 Deliverable Α        │  ██████████████████████                       │
│    └ Task 1              │     ████████████                               │
│    └ Task 2              │              ████████████████                  │
│  📦 Deliverable Β        │                       ██████████████████       │
│    └ Task 3              │                       ██████                   │
│  ⚡ Tasks χωρίς deliverable│                                  ████████   │
└──────────────────────────┴────────────────────────────────────────────────┘
```

---

## Νέο Component: `ProjectGanttView.tsx`

**Νέο αρχείο**: `src/components/projects/ProjectGanttView.tsx`

### Props
```typescript
interface ProjectGanttViewProps {
  projectId: string;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
}
```

### Data Fetching
- Tasks: `id, title, status, priority, start_date, due_date, deliverable_id, assigned_to` + assignee profile
- Deliverables: `id, name, due_date, completed`
- Grouping: Tasks ομαδοποιούνται κάτω από το deliverable τους, τα unassigned σε ξεχωριστή ομάδα

### Χρονολογικό Εύρος (Timeline Range)
- **Αρχή**: `min(project.start_date, earliest task.start_date || task.due_date)` 
- **Τέλος**: `max(project.end_date, latest task.due_date)` + buffer 2 εβδομάδες
- Αν δεν υπάρχουν ημερομηνίες, default ±3 μήνες από σήμερα
- **Granularity toggle**: Εβδομάδες (default) ή Μήνες (για μεγάλα έργα)

### Οπτικά στοιχεία κάθε μπάρας

| Τύπος | Χρώμα | Ύψος | Εικονίδιο |
|-------|-------|------|-----------|
| Deliverable | `bg-primary` | 6px | 📦 |
| Task `todo` | `bg-muted-foreground/40` | 16px | ○ |
| Task `in_progress` | `bg-primary` | 16px | ⟳ |
| Task `review` | `bg-warning` | 16px | ! |
| Task `internal_review` | `bg-violet-500` | 16px | 🏢 |
| Task `client_review` | `bg-orange-500` | 16px | 🤝 |
| Task `completed` | `bg-success` | 16px | ✓ |
| Task overdue | `bg-destructive` | 16px | ⚠ |

### Σήμανση "Σήμερα"
Μια κατακόρυφη κόκκινη γραμμή που δείχνει πού βρισκόμαστε στο timeline.

### Tooltip on hover
Κάθε μπάρα δείχνει tooltip με:
- Τίτλος
- Start date → Due date
- Status badge
- Assignee (για tasks)
- Progress %

---

## Controls (φίλτρα πάνω από το Gantt)

```text
┌─────────────────────────────────────────────────────┐
│ [Εβδομάδες | Μήνες]  [Φίλτρο Status ▼]  [Zoom ←→] │
└─────────────────────────────────────────────────────┘
```

- **Granularity toggle**: Εβδομάδες / Μήνες
- **Status filter**: Checkbox multi-select για φιλτράρισμα tasks
- **Scroll navigation**: Κουμπιά "< Πριν" / "Μετά >" ή scroll με mouse
- **Κουμπί "Σήμερα"**: Κεντράρει το view στη σημερινή ημερομηνία

---

## Τεχνική Υλοποίηση

### Layout με CSS Grid
```text
Το Gantt είναι ένα div με overflow-x:scroll
  Header row: sticky top με τους μήνες/εβδομάδες  
  Body rows: flex row με fixed αριστερό panel + scrolling bars area
  Κάθε μπάρα: position:absolute, left% + width% βάσει ημερομηνιών
```

### Υπολογισμός θέσης μπάρας
```typescript
// left% = (startDate - timelineStart) / totalDays * 100
// width% = (endDate - startDate) / totalDays * 100
const getBarStyle = (startDate: Date, endDate: Date) => ({
  left: `${((startDate - timelineStart) / totalMs) * 100}%`,
  width: `${((endDate - startDate) / totalMs) * 100}%`,
  minWidth: '4px' // για tasks χωρίς start_date (μόνο due_date = 1 ημέρα)
});
```

### Χειρισμός tasks χωρίς start_date
Αν task έχει μόνο `due_date` (κοινή περίπτωση), εμφανίζεται ως **διαμαντένιο milestone marker** (◆) στο due_date αντί για μπάρα.

---

## Αλλαγές στο `ProjectDetail.tsx`

Προσθήκη νέου tab "Timeline":

```typescript
// Στο TabsList:
<TabsTrigger value="timeline">
  <GanttChartSquare className="h-4 w-4 mr-1.5" />
  Timeline
</TabsTrigger>

// Νέο TabsContent:
<TabsContent value="timeline">
  <ProjectGanttView
    projectId={project.id}
    projectStartDate={project.start_date}
    projectEndDate={project.end_date}
  />
</TabsContent>
```

---

## Αρχεία που αλλάζουν

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/components/projects/ProjectGanttView.tsx` | **Νέο αρχείο** — πλήρες Gantt component |
| `src/pages/ProjectDetail.tsx` | Προσθήκη tab "Timeline" + import |

---

## UX Λεπτομέρειες

- **Empty state**: Αν δεν υπάρχουν tasks/deliverables με ημερομηνίες, εμφανίζεται friendly message
- **Loading skeleton**: Animated rows ενώ φορτώνει
- **Horizontal scroll**: Smooth, με scrollbar εμφανή
- **Mobile**: Σε κινητό εμφανίζει μόνο τη λίστα tasks ταξινομημένη κατά due_date (fallback)
- **Task click**: Ανοίγει το task detail page (navigate `/tasks/:id`)

