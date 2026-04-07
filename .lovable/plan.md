

# Task Detail — Three-Column Layout Redesign

## Current Layout (2 columns)
```text
LEFT (flex-1)                    RIGHT (w-72)
├─ Description + Tags           ├─ Ανάθεση
├─ Subtasks                     ├─ Χρονοδιάγραμμα
└─ Tabs (Σχόλια/Αρχεία/         ├─ Ροή Κατάστασης
   Χρόνος/Ιστορικό)             ├─ Ιδιότητες
                                 ├─ Εξαρτήσεις
                                 ├─ Επανάληψη
                                 ├─ Έγκριση & Review
                                 └─ Media Source
```

## New Layout (3 columns)
```text
LEFT (w-64)                 CENTER (flex-1)              RIGHT (w-72)
├─ Ανάθεση                 ├─ Description + Tags        ├─ Σχόλια (CommentsSection)
├─ Χρονοδιάγραμμα          ├─ Subtasks                  ├─ Εξαρτήσεις
├─ Ροή Κατάστασης          └─ Tabs (Αρχεία/Χρόνος/      ├─ Επανάληψη
├─ Ιδιότητες                    Ιστορικό)                ├─ Έγκριση & Review
└─ Media Source                                          └─ (empty space)
```

Key changes:
- **Left column**: Assignment, Timeline, Status Flow, Properties, Media Source — the "identity" cards
- **Center**: Description, Subtasks, remaining tabs (Files, Time, History — comments tab removed)
- **Right column**: Comments (promoted to always-visible card, no longer in tabs), Dependencies, Recurrence, Review/Approval
- On screens < `lg`, left & right columns collapse — left goes above center, right goes below (stacked)

## File Changes

| File | Change |
|------|--------|
| `src/pages/TaskDetail.tsx` | Restructure to 3-column layout, move Comments out of Tabs into right column as standalone card, redistribute cards |

