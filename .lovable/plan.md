

# Plan: My Work Page — Apple Design System Refresh

Η σελίδα MyWork χρειάζεται ενημέρωση ώστε να ακολουθεί τα design tokens του Apple-inspired system (rounded-[16px] cards, border-border/30, p-5, icon boxes bg-primary/8, text-[13px] titles, shadows, spacing).

## Changes

### `src/pages/MyWork.tsx`

**Header Section:**
- Greeting: `text-2xl font-semibold tracking-tight` (not bold, tighter)
- Date subtitle: keep `text-sm text-muted-foreground`
- KPI chips: add `bg-muted/50` backdrop, consistent `rounded-[10px]` pill shape

**View Toggle:**
- Use segment-control style (pill bg-muted container with active pill bg-card shadow-sm), matching Phase 2 tabs

**Cards (Today's Tasks, Active Projects, Approvals, Time Tracking):**
- Replace `border-border/40` → `border-border/30`
- Add `rounded-[16px] shadow-sm`
- CardHeader titles: icon in `h-7 w-7 rounded-lg bg-primary/8 text-primary` box + `text-[13px] font-semibold tracking-tight`
- CardContent padding: `p-5` where appropriate
- Dividers: `divide-border/20` (subtler)

**Project Row:**
- Hover: `hover:bg-accent/30` (softer)
- Progress bar: already uses Phase 3 component
- External link icon: `hover:text-primary transition-colors`

**Task Row:**
- Rounded: `rounded-[10px]` hover state
- Play/stop buttons: `rounded-[10px]`
- Status pill: `rounded-[6px]`

**Calendar View:**
- Day cells: `rounded-[10px]` hover, `bg-primary/5` for today
- Week header: softer `bg-muted/20`

**Approvals section:**
- Section headers: `bg-muted/30 rounded-[10px]` instead of plain `bg-muted/20`
- Approve/reject buttons: already good, add `rounded-[10px]`

**Time Tracking widget:**
- Active timer: `rounded-[12px]`, `bg-primary/5 border-primary/15`
- Entry list: `tabular-nums` on times

**Task Detail Sheet:**
- Info cards: `rounded-[12px]` instead of `rounded-lg`
- Labels: `text-[11px]` uppercase tracking

**Quick Notes (`src/components/my-work/QuickNotes.tsx`):**
- Outer card: `rounded-[16px] border-border/30 shadow-sm`
- Header: icon box `bg-primary/8 text-primary`, title `text-[13px] font-semibold tracking-tight`
- Note list items: `rounded-[10px]` hover/active states
- Editor area: cleaner borders, match input styles
- AI Actions button: `rounded-[10px]`
- Search input: already Phase 1 styled

### Files to Modify

| File | Scope |
|------|-------|
| `src/pages/MyWork.tsx` | Full page: header, cards, rows, calendar, sheets |
| `src/components/my-work/QuickNotes.tsx` | Card, list items, editor toolbar |

All changes are className-level only — no logic or API changes.

