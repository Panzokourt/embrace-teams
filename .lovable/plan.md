

# Fix Low-Contrast Lime Elements -- Replace with Dark Foreground

## Problem

Elements using the outline style (borders + text in lime green `#D4FF37`) are nearly invisible against the light off-white background. This affects:
- Outline buttons (border + text in lime)
- Link buttons (text in lime)
- Checkboxes (border in lime)
- Any other element using `text-primary` or `border-primary` without a filled background

## Solution

Change the `outline` and `link` button variants, and checkbox borders, to use the dark foreground color instead of lime. Lime green works great as a **filled background** (primary buttons, badges, progress bars) but fails as outline/text-only on light backgrounds.

---

## Changes

### 1. Button Variants (`src/components/ui/button.tsx`)

- **outline**: Change from `border-primary/60 text-primary` to `border-foreground/20 text-foreground` with hover becoming `bg-foreground text-background`
- **link**: Change from `text-primary` to `text-foreground`

### 2. Checkbox (`src/components/ui/checkbox.tsx`)

- Change unchecked border from `border-primary` to `border-foreground/30`
- Keep checked state as `bg-primary text-primary-foreground` (filled lime works fine)

### 3. Report Export Menu (`src/components/reports/ReportExportMenu.tsx`)

- No changes needed -- it uses `variant="outline"` which will auto-fix

### 4. No other files need changes

All toolbar buttons (TableToolbar, ColumnVisibilityToggle, WorkDayClock "Start Day") use `variant="outline"` from the Button component, so they will all inherit the fix automatically.

---

## Technical Details

| File | Change |
|------|--------|
| `src/components/ui/button.tsx` | `outline` variant: `border-foreground/20 text-foreground hover:bg-foreground hover:text-background`; `link` variant: `text-foreground` |
| `src/components/ui/checkbox.tsx` | Unchecked border: `border-foreground/30` instead of `border-primary` |

Two files, minimal changes, maximum impact across the entire app.

