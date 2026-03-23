

# Plan: Apple-Inspired Design System Refresh — Phase 1 (Foundation)

Θα εφαρμόσουμε σταδιακά ένα νέο design system εμπνευσμένο από το Apple HIG (Human Interface Guidelines). Ξεκινάμε με τη **Phase 1** που αφορά τα θεμέλια: χρώματα, τυπογραφία, spacing, και τα βασικά UI primitives.

## Design Philosophy

```text
Apple HIG Principles:
├── Clarity     — Κείμενο ευανάγνωστο σε κάθε μέγεθος, εικονίδια ακριβή
├── Deference   — Το UI βοηθά χωρίς να ανταγωνίζεται το περιεχόμενο
└── Depth       — Layers, translucency, motion δίνουν ιεραρχία
```

## Phase 1: Foundation Tokens & Core Primitives

### 1. Color Palette Overhaul (`src/index.css`)

**Αντικαθιστούμε το Lime Green** με μια πιο ώριμη παλέτα — **Blue accent** (ala Apple) με warm neutrals:

| Token | Light Mode | Dark Mode | Σκοπός |
|-------|-----------|-----------|--------|
| `--background` | `0 0% 98%` (σχεδόν λευκό) | `240 6% 10%` (βαθύ σκούρο) | Page bg |
| `--card` | `0 0% 100%` (λευκό) | `240 5% 14%` (elevated) | Cards |
| `--primary` | `211 100% 50%` (Apple Blue #007AFF) | `211 100% 64%` | CTA, active states |
| `--primary-foreground` | `0 0% 100%` | `0 0% 100%` | Text on primary |
| `--muted` | `240 5% 96%` | `240 4% 20%` | Subtle backgrounds |
| `--muted-foreground` | `240 4% 46%` | `240 5% 65%` | Secondary text |
| `--border` | `240 6% 90%` | `240 4% 22%` | Borders (subtle) |
| `--destructive` | `0 84% 60%` | `0 72% 65%` | Errors (Apple Red) |
| `--success` | `142 71% 45%` | `142 60% 55%` | Success (Apple Green) |
| `--warning` | `35 92% 50%` | `35 82% 58%` | Warnings (Apple Orange) |

**Contrast ratios**: Ολα τα foreground/background ζεύγη θα έχουν τουλάχιστον **4.5:1** (WCAG AA).

### 2. Typography Update

- **Primary font**: `Inter` (ήδη loaded) — κοντά στο SF Pro
- **Display font**: `Plus Jakarta Sans` → αντικαθιστούμε headings με `Inter` weight 600-700 για ομοιομορφία
- Body: `Inter 400/500`, 15px base (not 14px) — Apple uses 17pt, αλλά για desktop 15px είναι optimal
- Letter-spacing: `-0.01em` body, `-0.02em` headings (Apple-style tight tracking)

### 3. Core UI Components Update

**Button** (`button.tsx`):
- Μικρότερο border-radius: `rounded-xl` → `rounded-[10px]` (Apple's 10px corners)
- Αφαίρεση `active:scale[0.97]` — αντικαθίσταται με opacity transition
- Ghost variant: `hover:bg-foreground/5` (πιο subtle)
- Consistent heights: `h-9` default, `h-8` sm, `h-10` lg

**Card** (`card.tsx`):
- `rounded-2xl` → `rounded-[16px]` 
- Border: `border-border/30` (πιο αχνό)
- Shadow: lighter, more diffused Apple-style shadows

**Badge** (`badge.tsx`):
- `rounded-full` stays
- Πιο ελαφρύ background: `bg-primary/8` instead of `/10`
- Font: `font-medium text-[11px]` (Apple uses small caps)

**Input** (`input.tsx`):
- `rounded-[10px]`, consistent `h-9`
- Focus: `ring-2 ring-primary/30` (no border color change, just ring)

**Tabs** (`tabs.tsx`):
- Segment-control style (Apple): pill background `bg-muted`, active pill `bg-card shadow-sm`
- No primary color on active tab — just elevated white pill

**Dialog** (`dialog.tsx`):
- `rounded-[20px]`, `shadow-2xl`
- Overlay: `bg-black/40 backdrop-blur-xl` (Apple frosted glass)

**Select** (`select.tsx`):
- Match input styling: `rounded-[10px]`, `h-9`

### 4. Spacing & Layout Tokens

- `--radius`: `0.625rem` (10px) — down from 1rem
- Page shell padding stays `p-6`
- Card internal padding: `p-5` (from `p-6`) — tighter Apple density
- Gap system: 2/3/4/6/8 (multiples of 4px grid)

### 5. Shadows (Apple-style layered)

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06);
--shadow-md: 0 2px 8px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
--shadow-lg: 0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);
--shadow-xl: 0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06);
```

### 6. Sidebar Rail Adjustment
- Keep dark rail but use `--primary` (blue) for active indicator instead of lime
- Active icon: white circle bg with blue icon (ala macOS dock)

## Files to Modify (Phase 1)

| File | Changes |
|------|---------|
| `src/index.css` | Full color token overhaul (light + dark), typography, shadows |
| `tailwind.config.ts` | Update `--radius` default, font stack |
| `src/components/ui/button.tsx` | Radius, heights, hover/active states |
| `src/components/ui/card.tsx` | Radius, border, shadow |
| `src/components/ui/badge.tsx` | Size, opacity adjustments |
| `src/components/ui/input.tsx` | Radius, height, focus ring |
| `src/components/ui/tabs.tsx` | Segment-control style |
| `src/components/ui/dialog.tsx` | Radius, overlay blur |
| `src/components/ui/select.tsx` | Match input styling |
| `src/components/layout/AppSidebar.tsx` | Active indicator color (lime → blue) |

## Phasing Plan (Future)

- **Phase 2**: Table components, dropdown menus, popovers, context menus, toast notifications
- **Phase 3**: Page headers, navigation patterns, form layouts
- **Phase 4**: Charts/data viz colors, status colors (mondayStyleConfig), calendar
- **Phase 5**: Animations, transitions, micro-interactions

Αυτό το Phase 1 αλλάζει **μόνο** τα θεμέλια — κάθε component στην εφαρμογή θα κληρονομήσει αυτόματα τα νέα tokens χωρίς να χρειαστεί να πειράξουμε δεκάδες σελίδες.

