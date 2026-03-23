

# Phase 5: Final Sweep — Missing Updates + Animations & Micro-interactions

## Gaps Found in Phases 2-4

| Component | Issue |
|-----------|-------|
| `chartStyles.ts` | Missing `import React` — TS error on `React.CSSProperties` |
| `tailwind.config.ts` | Chart color `6` missing from tailwind colors map |
| `alert-dialog.tsx` | Old style: `bg-black/80` overlay, `sm:rounded-lg`, plain border |
| `hover-card.tsx` | Old: `rounded-md`, no `backdrop-blur-xl`, plain border |
| `navigation-menu.tsx` | Viewport: `rounded-md`, plain border/shadow |
| `drawer.tsx` | Overlay: `bg-black/80`, no blur; handle bar too wide |
| `accordion.tsx` | Trigger has `hover:underline` — should be `hover:text-foreground` |

## Phase 5: Animations & Micro-interactions

Add refined Apple-style motion to the system:
- **Page transition wrapper** utility class in `index.css`
- **Stagger animation** utilities (already partially exist, ensure in tailwind config)
- **Spring easing** — already have `cubic-bezier(0.16, 1, 0.3, 1)`, add a bounce variant
- **Skeleton shimmer** — already exists, verify it works with new bg

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/chartStyles.ts` | Add missing React import |
| `tailwind.config.ts` | Add `chart-6` color, add `bounce` keyframe, add `slide-up`/`slide-down` keyframes |
| `src/components/ui/alert-dialog.tsx` | Apple overlay (`bg-black/40 backdrop-blur-xl`), `rounded-[20px]`, `border-border/30` |
| `src/components/ui/hover-card.tsx` | `rounded-xl`, `border-border/30`, `backdrop-blur-xl`, `shadow-lg` |
| `src/components/ui/navigation-menu.tsx` | Viewport: `rounded-xl`, `border-border/30`, trigger: `rounded-[10px]` |
| `src/components/ui/drawer.tsx` | Overlay: `bg-black/40 backdrop-blur-xl`, handle: `w-10 h-1 bg-muted-foreground/30` |
| `src/components/ui/accordion.tsx` | Remove `hover:underline`, add `hover:text-foreground transition-colors`, subtler border |
| `src/index.css` | Add `.animate-stagger` utility, refine existing animation classes |

All changes are className-level only — no API or structural changes.
