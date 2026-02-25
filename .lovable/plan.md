


# Sidebar & Right Panel UI Overhaul

## 1. Right Panel -- Docked with Resizable Width (No Blur)

**File: `src/components/layout/AppLayout.tsx`**

Remove the overlay/blur behavior entirely. The right panel will always render as a **docked column** next to the main content, with a **draggable resize handle** between them.

- Replace the current `showOverlayRightPanel` and `showDrawerRightPanel` with a single docked approach (keep drawer only for mobile).
- Add a vertical drag handle (4px border area) between main content and right panel.
- Right panel width: min 300px, max 500px, default 380px. Store in localStorage.
- On mobile (layoutState === 'mobile'), keep Sheet/drawer behavior.

**File: `src/components/secretary/SecretaryPanel.tsx`**

- Tab buttons: show **only icons**. Add `Tooltip` with label on hover.
- Remove the text `<span>` entirely.

## 2. Sidebar -- Resizable Width with Auto-Collapse

**File: `src/components/layout/AppLayout.tsx`**

- Add a **drag handle** on the right edge of the sidebar container.
- Sidebar width: min 200px, max 320px when expanded. Default 240px.
- If user drags below ~180px threshold, auto-collapse to rail (48px).
- If user drags from rail outward past ~120px, auto-expand to min 200px.
- Store width preference in localStorage.

## 3. Rail Design -- Always Dark, Rounded, Floated

**File: `src/components/layout/AppSidebar.tsx`**

Redesign the `IconRail` component:
- Background: always dark (`bg-[#1A1A1A]`) regardless of theme.
- Text/icons: light colors (`text-white/70`, active `text-white`).
- Shape: add margin (m-2) and rounded corners (rounded-2xl) so it looks "floated" within the sidebar area.
- Active indicator: use a bright dot or pill instead of the left border stripe.
- The rail container gets `h-[calc(100%-16px)] my-2 ml-2 rounded-2xl` for the floated look.

## 4. Move AI Secretary & + New Buttons to Rail

**File: `src/components/layout/AppSidebar.tsx`**

- Remove the "AI Secretary" NavLink and "New..." Popover from `CategoryPanelContent`.
- Add them as icon buttons at the bottom of `IconRail` (before theme toggle and avatar):
  - `Zap` icon for Secretary (navigates to /secretary)
  - `Plus` icon for Quick Actions (opens the same Popover)
- Both get tooltips on hover.

## 5. User Avatar -- Rail Only

**File: `src/components/layout/AppSidebar.tsx`**

- Remove `<UserMenu>` from `CategoryPanelContent`.
- The avatar is already in `IconRail` -- enhance it to open the same `DropdownMenu` with sign-out option.

## 6. Bigger Logo

**File: `src/components/layout/AppSidebar.tsx`**

- Change logo from `h-7 w-7` to `h-9 w-9` in the `IconRail`.

---

## Files Summary

| File | Changes |
|------|---------|
| `src/components/layout/AppLayout.tsx` | Docked right panel always (no blur/overlay except mobile). Add resize handles for sidebar and right panel. |
| `src/components/layout/AppSidebar.tsx` | Dark floated rail design. Move Secretary + Quick Actions + Avatar to rail. Remove them from panel. Bigger logo. |
| `src/components/secretary/SecretaryPanel.tsx` | Icon-only tabs with tooltip labels. |
