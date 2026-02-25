

# Responsive Layout System -- State-Based Behavior

## Overview

Implement a 4-state responsive layout system that adapts the 3-panel structure (Sidebar, Main Content, Right Panel) based on viewport width, using a combination of JS-based layout states and CSS.

---

## Layout States

```text
STATE A (>= 1440px) -- Wide Desktop
+----------+---------------------------+-----------+
| Sidebar  |      Main Content         |  Right    |
| expanded |                           |  Panel    |
| (icons + |                           |  docked   |
|  labels) |                           |           |
+----------+---------------------------+-----------+

STATE B (1200-1439px) -- Standard Desktop
+----------+----------------------------------+
| Sidebar  |         Main Content             |
| expanded |                                  |
| (icons + |    Right Panel = slide-over      |
|  labels) |    overlay from right            |
+----------+----------------------------------+

STATE C (992-1199px) -- Narrow Desktop
+------+--------------------------------------+
| Rail |          Main Content                |
| only |     (compact density)               |
| icons|    Right Panel = drawer overlay      |
+------+--------------------------------------+

STATE D (< 992px) -- Mobile/Tablet
+--------------------------------------------+
|          Main Content                      |
|     (single column, compact)               |
|  Sidebar = hamburger overlay               |
|  Right Panel = modal/drawer                |
+--------------------------------------------+
```

---

## New Hook: `useLayoutState`

Create `src/hooks/useLayoutState.ts` -- a single hook that provides the current layout state and derived booleans.

```typescript
type LayoutState = 'wide' | 'standard' | 'narrow' | 'mobile';

Returns:
- layoutState: LayoutState
- sidebarMode: 'expanded' | 'collapsed' | 'hidden'
- rightPanelMode: 'docked' | 'overlay' | 'drawer'
- density: 'comfortable' | 'compact'
```

Uses `window.matchMedia` listeners (not resize polling) for the 4 breakpoints: 1440, 1200, 992.

---

## New Context: `useLayoutDensity`

Create `src/contexts/LayoutContext.tsx` to provide density mode globally so cards/pages can adapt padding and spacing.

---

## Files to Modify

### 1. `tailwind.config.ts`
- Add custom screens: `narrow: '992px'`, `standard: '1200px'`, `wide: '1440px'`
- Add utility classes for line-clamp (already available via tailwindcss built-in)

### 2. `src/hooks/useLayoutState.ts` (NEW)
- Core layout state logic with matchMedia listeners
- Returns layoutState, sidebarMode, rightPanelMode, density
- Respects user preference for sidebar collapse (localStorage)

### 3. `src/contexts/LayoutContext.tsx` (NEW)
- Provides `density` ('comfortable' | 'compact') to all children
- Auto-switches based on layout state (compact for narrow + mobile)

### 4. `src/components/layout/AppLayout.tsx` (MAJOR REWRITE)
Current: Uses ResizablePanelGroup for all states with `hidden md:block` on sidebar.

New behavior:
- **State A (wide)**: Keep ResizablePanelGroup with all 3 panels docked. Right panel auto-opens.
- **State B (standard)**: ResizablePanelGroup with sidebar + main only. Right panel renders as a fixed overlay (absolutely positioned over the right edge, not inside the panel group), with slide-in animation.
- **State C (narrow)**: Sidebar auto-collapses to icon-only rail. Right panel renders as Sheet/Drawer overlay.
- **State D (mobile)**: Sidebar hidden entirely (hamburger Sheet exists already). Right panel renders as bottom Sheet/Drawer.
- Remove the `hidden md:block` on sidebar panel; replace with state-based rendering.

### 5. `src/components/layout/AppSidebar.tsx`
- In State C: force `collapsed=true` regardless of user pref (auto-collapse)
- In State D: don't render desktop sidebar at all (only Sheet mobile menu)
- Add `truncate` / `line-clamp-1` to nav labels
- Add `min-w-0` on text containers to prevent overflow

### 6. `src/components/layout/TopBar.tsx`
- In State D: show hamburger trigger button (currently exists but at fixed position)
- Move the hamburger button from AppSidebar's fixed div into TopBar for mobile
- Buttons switch to icon-only in narrow/mobile (hide text labels)
- Search bar: shorter placeholder text on narrow

### 7. `src/components/secretary/SecretaryPanel.tsx`
- Tab labels: always show icons, hide text below 1200px (use layout state)
- Already has `hidden sm:inline` on labels -- adjust to use layout-aware classes

### 8. `src/pages/Knowledge.tsx` (page-specific)
- KPI grid: `grid-cols-1 sm:grid-cols-2 wide:grid-cols-4` (use new breakpoints)
- Category tree: on narrow/mobile, render as a Select dropdown instead of sidebar tree
- Article grid: adjust columns based on available space

---

## Density System

Add a CSS custom property approach via a class on the root layout:

```css
.density-comfortable { --density-padding: 1.5rem; --density-gap: 1.5rem; --density-card-p: 1.5rem; }
.density-compact { --density-padding: 1rem; --density-gap: 1rem; --density-card-p: 1rem; }
```

Pages that use `p-6 space-y-6` will be updated to use `p-[var(--density-padding)] space-y-[var(--density-gap)]` or a utility class.

---

## Text Overflow Prevention

Apply across all card components and nav:
- Card titles: `line-clamp-1`
- Card subtitles: `line-clamp-1`  
- Card descriptions: `line-clamp-2`
- Nav labels: `truncate` (already some, ensure all)
- Buttons in TopBar: icon-only mode below 992px

---

## Right Panel Overlay Behavior (States B/C/D)

For States B and C, the right panel renders as:
- An absolutely positioned panel sliding in from the right edge
- With a semi-transparent backdrop that closes it on click
- Uses existing `animate-slide-in-right` / `animate-slide-out-right` keyframes
- Does NOT resize the main content (pure overlay)

For State D:
- Uses the existing `Sheet` component with `side="right"`

---

## Files Summary

| File | Action |
|------|--------|
| `tailwind.config.ts` | Add `narrow`, `standard`, `wide` screen breakpoints |
| `src/hooks/useLayoutState.ts` | NEW -- layout state hook |
| `src/contexts/LayoutContext.tsx` | NEW -- density context provider |
| `src/components/layout/AppLayout.tsx` | Rewrite panel rendering per layout state |
| `src/components/layout/AppSidebar.tsx` | Auto-collapse logic, text truncation |
| `src/components/layout/TopBar.tsx` | Mobile hamburger integration, icon-only buttons |
| `src/components/secretary/SecretaryPanel.tsx` | Responsive tab labels |
| `src/pages/Knowledge.tsx` | Responsive KPI grid, category dropdown on mobile |
| `src/index.css` | Add density CSS custom properties |

