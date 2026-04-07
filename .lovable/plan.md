

# Plan: Fix Blank Pages — Tailwind v4/v3 Incompatibility

## Root Cause

Η εντολή `npx shadcn@latest init --preset ...` εγκατέστησε **Tailwind v4 components** σε project που τρέχει **Tailwind v3**. Αυτό σπάει ΟΛΟΚΛΗΡΗ την εφαρμογή γιατί:

1. **`@import "shadcn/tailwind.css"`** — χρησιμοποιεί `@theme inline`, `@custom-variant`, `@utility` (v4-only syntax)
2. **`@import "tw-animate-css"`** — πιθανόν v4-only
3. **28 UI component files** χρησιμοποιούν v4 classes: `outline-ring`, `ring-ring/50`, `border-transparent!`, `group-data-*`, `has-data-*`, `data-open:`, `data-closed:`, `w-(--sidebar-width)`

Αποτέλεσμα: Το CSS processing αποτυγχάνει → κανένα style → blank page.

## Solution: Restore Pre-Redesign UI Components + Keep CSS Tokens

Η πιο ασφαλής λύση είναι:

### Phase 1: Fix index.css
- Remove `@import "shadcn/tailwind.css"` and `@import "tw-animate-css"` (v4 imports)
- Keep the oklch CSS variable tokens (these work fine in v3 as raw CSS custom properties)

### Phase 2: Restore all 28 UI components to v3-compatible versions
The following files need to be reverted to their Tailwind v3 (shadcn/ui v0.x) versions — removing all v4-only syntax:

`accordion.tsx`, `alert-dialog.tsx`, `alert.tsx`, `avatar.tsx`, `badge.tsx`, `button.tsx`, `calendar.tsx`, `card.tsx`, `command.tsx`, `context-menu.tsx`, `dialog.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `hover-card.tsx`, `input-group.tsx`, `label.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `popover.tsx`, `scroll-area.tsx`, `select.tsx`, `sheet.tsx`, `sidebar.tsx`, `switch.tsx`, `tabs.tsx`, `toggle-group.tsx`, `toggle.tsx`, `tooltip.tsx`

For each file, the v4 syntax will be converted:
- `outline-ring` → removed or replaced with `outline-none ring-2 ring-ring`
- `ring-ring/50` → `ring-ring ring-opacity-50` or `ring-offset-2`
- `border-transparent!` → `!border-transparent`
- `group-data-vertical/tabs:` → standard conditional classes
- `has-data-[...]` → removed (no v3 equivalent)
- `data-open:` / `data-closed:` → `data-[state=open]:` / `data-[state=closed]:`
- `w-(--sidebar-width)` → inline style or CSS variable fallback

### Phase 3: Fix date-fns
- Add Vite resolve alias for `date-fns/locale.mjs` → `date-fns/locale` (the `.mjs` files no longer exist in the installed version)

## Alternative: Restore from History

Αν προτιμάς, μπορείς να κάνεις **restore σε version πριν το redesign** μέσω History, και να ξαναξεκινήσουμε το redesign σωστά — αυτή τη φορά **χωρίς** να τρέξουμε `shadcn init` (που εγκατέστησε v4 components) αλλά κρατώντας τα v3 components και αλλάζοντας μόνο τα CSS tokens/colors.

**Σύσταση**: Η επαναφορά μέσω History είναι πιο γρήγορη και ασφαλής, γιατί η μετατροπή 28 αρχείων χειροκίνητα είναι πολύ εκτεταμένη και error-prone.

