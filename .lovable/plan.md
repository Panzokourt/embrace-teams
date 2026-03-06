

# Plan: Add Overview Tab & Remove Right Sidebar

## What Changes

1. **Add "Επισκόπηση" (Overview) tab** as the first/default tab containing all project info currently in the right sidebar panel — Project Info card (description, client, budget, agency fee, dates, tracked hours, task/deliverable counts) and Team card.

2. **Remove the right sidebar panel** (`div.w-72`) entirely — the 2-column layout becomes a single full-width column for all tabs.

3. **Overview tab layout**: Use a responsive grid (e.g. `grid-cols-1 lg:grid-cols-2`) with:
   - Left column: Project Info card (description, budget, fee, dates, duration, hours, stats)
   - Right column: Team card
   - This gives the info more horizontal space and a cleaner layout on all screen sizes.

## File Changes

| File | Change |
|---|---|
| `src/pages/ProjectDetail.tsx` | Add `<TabsTrigger value="overview">` as first tab; add `<TabsContent value="overview">` with the info + team cards moved into it; remove the right sidebar `div`; change `defaultValue` to `"overview"`; remove `flex gap-6 items-start` wrapper — tabs become full width |

## Layout Structure (After)

```text
┌─────────────────────────────────────────────┐
│ Header (back, title, status, client, timer) │
├─────────────────────────────────────────────┤
│ [Επισκόπηση] [Παραδοτέα] [Tasks] [...]      │
├─────────────────────────────────────────────┤
│ Overview tab:                                │
│ ┌──────────────────┐ ┌────────────────────┐  │
│ │ Πληροφορίες Έργου│ │ Ομάδα Έργου        │  │
│ │ (description,    │ │ (lead, AM, members)│  │
│ │  budget, dates…) │ │                    │  │
│ └──────────────────┘ └────────────────────┘  │
│                                              │
│ Other tabs: full width, no sidebar           │
└─────────────────────────────────────────────┘
```

Single file edit, no database changes needed.

