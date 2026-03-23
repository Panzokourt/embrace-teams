

# Phase 4: Charts, Status Colors, Calendar & Data Visualization

## Overview
Align all data visualization, status/priority colors, and calendar components with the Apple-inspired design system. Unified chart styling, softer status palette, and polished calendar cells.

## 1. Chart Token System — Richer Palette (`src/index.css`)

Expand from 5 to 6 chart colors with better visual separation:

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--chart-1` | `211 100% 50%` (Blue) | `211 100% 64%` | Primary series |
| `--chart-2` | `172 66% 50%` (Teal) | `172 66% 55%` | Secondary |
| `--chart-3` | `280 65% 60%` (Purple) | `280 60% 68%` | Tertiary |
| `--chart-4` | `35 92% 50%` (Orange) | `35 82% 58%` | Quaternary |
| `--chart-5` | `0 84% 60%` (Red) | `0 72% 65%` | Quinary |
| `--chart-6` | `142 71% 45%` (Green) | `142 60% 55%` | Senary |

## 2. Unified Chart Tooltip Style

Create a shared `chartTooltipStyle` constant to eliminate repeated inline `contentStyle` across all chart widgets:

```ts
// src/components/dashboard/chartStyles.ts
export const chartTooltipStyle = {
  borderRadius: '12px',
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--popover))',
  backdropFilter: 'blur(16px)',
  fontSize: '12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
};
export const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--chart-6))',
];
```

Apply to all 6 chart widgets: `RevenueChart`, `CostBreakdownChart`, `HoursLoggedChart`, `PipelineStagesChart`, `WinRateTrendChart`, `TopClientsRevenue`.

## 3. Widget Card Consistency

All widget cards currently use `rounded-2xl border border-border/50 bg-card p-6 shadow-soft`. Update to match Phase 1 card system:
- `rounded-[16px] border border-border/30 bg-card p-5 shadow-sm`
- Icon box: `bg-primary/8 text-primary` (consistent with PageHeader)
- Title: `text-[13px] font-semibold tracking-tight`

## 4. Status & Priority Colors — Softer Apple Palette (`mondayStyleConfig.ts`)

Replace the hard Monday.com colors with softer, Apple-inspired versions that maintain readability:

| Status | Current | New |
|--------|---------|-----|
| todo | `#c4c4c4` | `#8E8E93` (Apple Gray) |
| in_progress | `#fdab3d` | `#FF9F0A` (Apple Orange) |
| review | `#e2445c` | `#FF375F` (Apple Pink) |
| internal_review | `#a25ddc` | `#BF5AF2` (Apple Purple) |
| client_review | `#ff642e` | `#FF6723` (Apple Deep Orange) |
| completed | `#00c875` | `#30D158` (Apple Green) |

| Priority | Current | New |
|----------|---------|-----|
| low | `#579bfc` | `#007AFF` (Apple Blue) |
| medium | `#fdab3d` | `#FF9F0A` (Apple Orange) |
| high | `#e2445c` | `#FF375F` (Apple Pink) |
| urgent | `#333333` | `#1C1C1E` (Apple Black) |

Update `GROUP_COLORS` map accordingly.

## 5. MondayStatusCell Polish (`MondayStatusCell.tsx`)

- Cells: `rounded-[6px]` (from plain `rounded`)
- Popover options: `rounded-[6px]`, remove `hover:scale-105` (too aggressive), add `hover:brightness-95 transition-all`
- Active ring: `ring-2 ring-white/30`

## 6. Calendar Polish

**CalendarMonthView.tsx**:
- Day cells: add `rounded-lg` on hover, smoother `hover:bg-accent/20`
- Today badge: keep `bg-primary text-primary-foreground`, add `shadow-sm`
- Outside month cells: `opacity-40` (from `opacity-35`)

**CalendarEventCard.tsx**:
- Remove `active:scale-[0.98]` — replace with `hover:brightness-95`
- Compact cards: `rounded-[4px]` (from `rounded`)
- Non-compact: `rounded-[10px]` border with left accent stripe (`border-l-2`)

**CalendarDayView.tsx**:
- Time label column: `text-[11px] text-muted-foreground/70 tabular-nums`
- Hour grid lines: `border-border/20` (subtler)

## 7. StatCard Refinement (`StatCard.tsx`)

- `rounded-3xl` → `rounded-[16px]` (consistent with cards)
- Primary variant icon: `text-primary` not `text-primary-foreground` (was wrong — white on light bg)
- Value text: `text-3xl` → `text-2xl` (stays), add `tabular-nums`

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Expand chart tokens (6 colors), adjust dark variants |
| `src/components/dashboard/chartStyles.ts` | **New** — shared tooltip style + color array |
| `src/components/shared/mondayStyleConfig.ts` | Apple-inspired status/priority colors |
| `src/components/shared/MondayStatusCell.tsx` | Rounded, smoother interactions |
| `src/components/dashboard/StatCard.tsx` | Radius, icon color fix, tabular-nums |
| `src/components/dashboard/widgets/RevenueChart.tsx` | Use shared styles |
| `src/components/dashboard/widgets/CostBreakdownChart.tsx` | Use shared styles + 6 colors |
| `src/components/dashboard/widgets/HoursLoggedChart.tsx` | Use shared styles |
| `src/components/dashboard/widgets/PipelineStagesChart.tsx` | Use shared styles |
| `src/components/dashboard/widgets/WinRateTrendChart.tsx` | Use shared styles |
| `src/components/dashboard/widgets/TopClientsRevenue.tsx` | Card class update |
| `src/components/dashboard/widgets/TasksByStatus.tsx` | Card class + status colors |
| `src/components/dashboard/widgets/ProjectProgress.tsx` | Card class update |
| `src/components/calendar/CalendarMonthView.tsx` | Cell polish, today badge |
| `src/components/calendar/CalendarEventCard.tsx` | Radius, hover, left accent |
| `src/components/calendar/CalendarDayView.tsx` | Grid line subtlety |

