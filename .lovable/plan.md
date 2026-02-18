

# Αναδιάρθρωση Task Detail Page - Clean Two-Column Layout

## Τρεχουσα κατασταση

Η σελίδα έχει:
- Header με τίτλο + badges
- 5 info cards σε grid (Υπεύθυνος, Προθεσμία, Εκτίμηση, Πραγματικός, Πρόοδος)
- Status bar
- Tabs κάτω (Overview, Σχόλια, Αρχεία, Χρόνος, Ιστορικό)

Στο Overview tab: 2 cards (Περιγραφή + Λεπτομέρειες) και Subtasks

## Προτεινομενη δομη (εμπνευσμενη απο reference)

Αντί για cards πάνω + tabs κάτω, γίνεται **two-column layout**:

```text
+------------------------------------------------------+---------------------------+
| Task Title (editable)                                 | Activity                  |
| Project link                                          |                           |
|                                                       |                           |
| Status    [ON GOING >]  |  Assignee   [Avatar(s)]    |                           |
| Dates     Start -> Due  |  Priority   [Medium]       |                           |
| Estimate  [8h]          |  Track time [Start]        |                           |
| Category  [Design]      |  Type       [Task]         |                           |
| Deliverable [X]         |  Progress   [65%]          |                           |
|                                                       |                           |
| ---------------------------------------------------- |  * User created task      |
| Add description...                                    |    Feb 4, 13:39           |
|                                                       |                           |
| ---------------------------------------------------- |  * Status changed         |
| Subtasks (3)                                          |    Todo -> In Progress    |
| [x] Research competitors                              |    Feb 11, 15:41          |
| [ ] Draft proposal                                    |                           |
| [ ] Review with client                                |                           |
|                                                       |                           |
| ---------------------------------------------------- | ------------------------- |
| [Σχόλια] [Αρχεία] [Χρόνος]  <- tabs μονο για αυτα   | Write a comment...        |
+------------------------------------------------------+---------------------------+
```

## Αλλαγες αναλυτικα

### 1. Two-column layout
- **Αριστερα (~70%)**: Ολες οι πληροφοριες του task
- **Δεξια (~30%)**: Activity feed (always visible, not in tab) + mini comment input

### 2. Properties Grid (αντι info cards)
Αντι 5 ξεχωριστες Card components, ενα clean grid 2 στηλων μεσα στη σελιδα:

| Label | Value (inline editable) |
|-------|------------------------|
| Κατασταση | Status badge + quick change |
| Υπευθυνος | Select dropdown |
| Ημερομηνιες | Start -> Due (2 date pickers) |
| Προτεραιοτητα | Select with color dots |
| Εκτιμηση | Number input |
| Πραγματικος | Display only |
| Προοδος | Progress slider |
| Τυπος | Select |
| Κατηγορια | Select |
| Παραδοτεο | Select |

Ολα inline-editable χωρις Cards, απλα rows με label-value.

### 3. Description section
- Κατω απο το properties grid, separator, μετα description area
- Κλικ για edit (οπως τωρα)

### 4. Subtasks section
- Κατω απο description
- Compact checklist style

### 5. Bottom tabs (simplified)
- Μονο 3 tabs: Σχολια, Αρχεια, Χρονος
- Activity και Overview δεν ειναι tabs πλεον (ειναι στο main layout)

### 6. Activity Sidebar (δεξια)
- Always-visible sidebar με timeline
- Scrollable
- Compact entries: user + action + timestamp
- Mini comment input στο κατω μερος

## Αρχεια

### Τροποποιημενα
- `src/pages/TaskDetail.tsx` -- Πληρης αναδιαρθρωση layout

## Σειρα υλοποιησης

1. Αλλαγη layout σε 2 στηλες (flex/grid)
2. Αντικατασταση info cards με properties grid (clean rows)
3. Μεταφορα activity σε δεξια sidebar (always visible)
4. Αφαιρεση Overview + Activity tabs, κρατημα μονο Σχολια/Αρχεια/Χρονος
5. Polish: spacing, separators, hover states

