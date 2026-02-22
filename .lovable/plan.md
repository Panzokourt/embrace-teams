

# Complete UI Design System Overhaul -- "Clean Tech Lime"

## Summary

A full visual redesign of the application from the current warm amber/gold accent theme to a modern "Clean Tech" aesthetic with Vibrant Lime Green (#D4FF37) as the hero accent color, off-white backgrounds, and Inter/Plus Jakarta Sans typography. This affects CSS variables, Tailwind config, and approximately 15-20 component files.

---

## Scope of Changes

### Phase 1: Foundation (CSS Variables + Tailwind Config)

**File: `src/index.css`**
- Replace the entire `:root` color palette:
  - `--background`: Off-white (#F4F7F6 -> ~148 14% 96%)
  - `--foreground`: Deep charcoal (#1A1A1A -> ~0 0% 10%)
  - `--card` / `--popover`: Pure white (#FFFFFF)
  - `--primary`: Vibrant Lime Green (#D4FF37 -> ~72 100% 61%)
  - `--primary-foreground`: Deep charcoal (#1A1A1A) -- dark text on lime
  - `--secondary`: Light grey tones
  - `--muted`: Soft grey (#6B7280 range)
  - `--border` / `--input`: Light grey (#E5E7EB)
  - `--accent`: Subtle lime tint for hover states
  - `--destructive`: Soft red (#EF4444)
  - `--warning`: Orange (#F59E0B)
  - `--success`: Keep green
  - `--ring`: Lime green
  - `--radius`: 1rem (keep, aligns with 16px)
- Replace `.dark` palette with complementary dark mode values (dark backgrounds with lime accents retained)
- Update font-family references from 'Source Sans Pro' to 'Inter'
- Update Google Fonts imports to load Inter + Plus Jakarta Sans
- Update `body` font-family to Inter
- Update heading font-family to Plus Jakarta Sans

**File: `tailwind.config.ts`**
- Update `fontFamily.sans` to `['Inter', ...]`
- Update `fontFamily.display` to `['Plus Jakarta Sans', ...]`
- Update shadow definitions to be softer (blur: 10-20px, opacity: 5%)
- Keep existing animation and keyframe definitions

---

### Phase 2: Core UI Components

**File: `src/components/ui/button.tsx`**
- Primary: Lime green bg, dark charcoal text, pill-shaped (rounded-full or rounded-2xl)
- Secondary/Outline: Transparent bg, lime border, lime text; hover fills lime
- Ghost: Subtle light grey hover
- Add hover scale effect

**File: `src/components/ui/badge.tsx`**
- Update default variant to use lime green tints
- Keep semantic variants (destructive, success, warning)

**File: `src/components/ui/input.tsx`**
- Background: White or very light grey (#F9FAFB)
- Border: Light grey, turns lime on focus
- Update focus ring to lime green

**File: `src/components/ui/tabs.tsx`**
- TabsList: White background
- Active tab: Lime green text with thick lime bottom border
- Inactive: Secondary text color, no border

**File: `src/components/ui/dialog.tsx`**
- Content background: Pure white, large border-radius (24px)
- Overlay: Semi-transparent dark (#00000080)

**File: `src/components/ui/sheet.tsx`**
- Same white background treatment

**File: `src/components/ui/toast.tsx`**
- Success variant: Lime green background with dark text
- Error: Soft red background
- Update rounded corners

**File: `src/components/ui/switch.tsx`**
- Checked state uses `--primary` (lime green) -- already does via CSS var, will auto-update

**File: `src/components/ui/select.tsx`**
- Popover/dropdown bg: Pure white, ensure high z-index (already z-50)
- Focus accent uses lime tint

**File: `src/components/ui/progress.tsx`**
- Indicator uses `--primary` (lime) -- auto-updates

---

### Phase 3: Layout Components

**File: `src/components/layout/AppSidebar.tsx`**
- Sidebar background: Pure white with subtle right border/shadow
- Active nav item: Lime green text + icon, solid lime accent bar on left edge
- Inactive: Secondary text, light icon
- Hover: Subtle lime green tint background (5% opacity)
- AI Secretary button: Change from violet gradient to lime green pill button
- Quick Actions button: Lime green pill style

**File: `src/components/layout/SidebarNavGroup.tsx`**
- Active group: Lime green tint background, lime text
- Inactive: Secondary text with grey hover

**File: `src/components/layout/TopBar.tsx`**
- Background: White with subtle bottom shadow
- Search bar: Light bg, clean minimal style

---

### Phase 4: Dashboard & Data Components

**File: `src/components/dashboard/StatCard.tsx`**
- Card: White bg, large rounded corners (24px), very subtle shadow
- Primary variant: Lime green tint
- Keep semantic color variants

**File: `src/pages/Dashboard.tsx`**
- Main canvas background already uses `--background` (will auto-update)
- Ensure cards use white backgrounds with soft shadows

**File: Chart colors (via CSS vars)**
- `--chart-1` through `--chart-5`: Primary lime green, charcoal, light grey variations

---

### Phase 5: Global CSS Polish

**File: `src/index.css`**
- Update `.card-elevated` shadow to be softer (blur: 10-20px, 5% opacity)
- Update `.glass` effect for new color scheme
- Update `::selection` to lime green tint
- Update scrollbar thumb colors
- Ensure all custom utility classes align with new palette

---

## Files Modified (Complete List)

| File | Change Type |
|------|------------|
| `src/index.css` | Full color palette rewrite, font imports, utility classes |
| `tailwind.config.ts` | Font families, shadow definitions |
| `src/components/ui/button.tsx` | Pill shape, new variant styles |
| `src/components/ui/badge.tsx` | Updated default variant |
| `src/components/ui/input.tsx` | Focus ring color, background |
| `src/components/ui/tabs.tsx` | Active tab lime underline style |
| `src/components/ui/dialog.tsx` | Larger radius, overlay opacity |
| `src/components/ui/sheet.tsx` | Rounded corners |
| `src/components/ui/toast.tsx` | Success variant styling |
| `src/components/layout/AppSidebar.tsx` | Active state left accent bar, hover tints, AI button |
| `src/components/layout/SidebarNavGroup.tsx` | Active/hover states |
| `src/components/layout/TopBar.tsx` | Search bar styling |
| `src/components/dashboard/StatCard.tsx` | Card radius, shadow |

---

## Technical Notes

- The design system is CSS-variable-driven, so changing values in `:root` and `.dark` in `index.css` automatically propagates to all components that reference `hsl(var(--primary))`, `hsl(var(--background))`, etc.
- Components that hardcode colors (like the AI Secretary gradient) need explicit updates.
- The `Inter` font will be loaded via Google Fonts CDN (replacing Source Sans Pro imports).
- No new dependencies are needed -- all changes are CSS/Tailwind/component styling.
- Dark mode will be maintained with adjusted values (dark backgrounds, brighter lime for contrast).

