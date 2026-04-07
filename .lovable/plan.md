

# Luma Redesign — Lime + Geist + Pill Geometry

## Phase A: Color System — Lime Theme
**`src/index.css`**
- Replace all Apple Blue (`211 100% 50%`) primary/ring/accent/sidebar-primary tokens with Lime equivalents
- Light: `--primary: 84 81% 44%`, `--accent: 84 60% 95%`, `--ring: 84 81% 44%`
- Dark: `--primary: 84 75% 52%`
- Chart palette: 6 shades of neutral gray (matching "Chart Color: Neutral")
- Sidebar tokens: dark inverted (`--sidebar-background: 240 6% 10%`, `--sidebar-foreground: 0 0% 98%`) in both light AND dark
- Update `.force-light` class to use lime primary

## Phase B: Typography — Geist Font
**`src/index.css`**: Replace Inter import with Geist
```
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');
```
Update `body` and heading font-family references to `'Geist'`

**`tailwind.config.ts`**: Update fontFamily.sans and fontFamily.display to `['Geist', 'Inter', ...]`

## Phase C: Geometry Updates

| File | Current | Change |
|------|---------|--------|
| `button.tsx` | `rounded-[10px]` | `rounded-full` (all sizes) |
| `badge.tsx` | `rounded-full` | Already correct |
| `card.tsx` | `rounded-2xl` | `rounded-[20px]` |
| `input.tsx` | `rounded-[10px]` | `rounded-xl` |
| `textarea.tsx` | `rounded-[10px]` | `rounded-xl` |
| `select.tsx` trigger | `rounded-[10px]` | `rounded-xl` |
| `tabs.tsx` list | `rounded-[10px]` | `rounded-full` |
| `tabs.tsx` trigger | `rounded-lg` | `rounded-full` |
| `dialog.tsx` | `rounded-[20px]` | Already correct |
| `alert-dialog.tsx` | `rounded-[20px]` | Already correct |
| `dropdown-menu.tsx` | `rounded-xl` | `rounded-2xl` |
| `context-menu.tsx` | `rounded-xl` | `rounded-2xl` |
| `popover.tsx` | `rounded-xl` | `rounded-2xl` |

## Phase D: Button Destructive Variant
- Change from `bg-destructive text-destructive-foreground` to `bg-destructive/10 text-destructive hover:bg-destructive/20` (softer, muted)

## Phase E: Sidebar Inverted Style
**`src/components/layout/AppSidebar.tsx`** — The sidebar tokens in CSS handle the dark inversion. No structural code changes needed since the sidebar already uses `--sidebar-*` tokens.

## Files to Modify (13 files)

| File | Changes |
|------|---------|
| `src/index.css` | Lime tokens, Geist import, neutral chart colors, inverted sidebar tokens |
| `tailwind.config.ts` | Geist in fontFamily |
| `src/components/ui/button.tsx` | `rounded-full`, softer destructive |
| `src/components/ui/card.tsx` | `rounded-[20px]` |
| `src/components/ui/input.tsx` | `rounded-xl` |
| `src/components/ui/textarea.tsx` | `rounded-xl` |
| `src/components/ui/select.tsx` | `rounded-xl` trigger |
| `src/components/ui/tabs.tsx` | `rounded-full` list + triggers |
| `src/components/ui/dropdown-menu.tsx` | `rounded-2xl` content + subcontent |
| `src/components/ui/context-menu.tsx` | `rounded-2xl` content + subcontent |
| `src/components/ui/popover.tsx` | `rounded-2xl` |

All className-level only. No API, logic, or structural changes.

