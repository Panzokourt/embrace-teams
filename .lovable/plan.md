

# Phase 3: Page Headers, Form Primitives & Navigation Polish

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/shared/PageHeader.tsx` | Refine spacing, icon box styling, breadcrumb link color |
| `src/components/ui/breadcrumb.tsx` | Smaller separator gap, subtler text styling |
| `src/components/ui/form.tsx` | Tighter `space-y-1.5` on FormItem, smaller FormDescription text |
| `src/components/ui/label.tsx` | `text-[13px]` with `tracking-tight`, `text-foreground/80` |
| `src/components/ui/textarea.tsx` | Match input: `rounded-[10px]`, focus `ring-2 ring-primary/30`, remove `ring-offset` |
| `src/components/ui/checkbox.tsx` | `rounded-[4px]`, `border-border` (not foreground/30), smooth checked transition |
| `src/components/ui/radio-group.tsx` | `border-border`, checked `border-primary`, transition |
| `src/components/ui/switch.tsx` | Apple-style: `h-[22px] w-[38px]`, thumb `h-[18px] w-[18px]`, smooth spring transition |
| `src/components/ui/progress.tsx` | `h-2` (thinner), remove border, `rounded-full`, `bg-primary` indicator with `rounded-full` |
| `src/components/ui/slider.tsx` | `h-1.5` track, thumb `h-4 w-4 shadow-md border-2 border-primary` |
| `src/components/ui/separator.tsx` | `bg-border/60` (subtler) |
| `src/components/ui/scroll-area.tsx` | Thinner scrollbar `w-1.5`, `bg-foreground/10` thumb |
| `src/components/ui/skeleton.tsx` | `rounded-[10px]`, `bg-muted/70` for subtlety |

## Key Design Decisions

- **PageHeader**: Icon box gets `bg-primary/8 text-primary` for a blue tint that ties into the Apple Blue system. Breadcrumb root link updated from "Dashboard" to reflect new default route.
- **Forms**: Tighter vertical rhythm (`space-y-1.5`), smaller helper text (`text-xs`), consistent error styling.
- **Textarea**: Matches the input component's existing Apple treatment (rounded-[10px], ring focus).
- **Toggle controls** (checkbox, radio, switch): Refined sizing and border colors to match the border token. Switch gets Apple's compact pill proportions.
- **Progress/Slider**: Thinner, more refined tracks. Progress loses its border for a cleaner inline look.

All changes are token-level or className-level — no structural/API changes to any component.

