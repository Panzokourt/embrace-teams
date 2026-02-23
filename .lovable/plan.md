

# Sidebar Icon Rail -- Two-Column Navigation

## Summary

Add a narrow icon rail (dark strip) on the left side of the existing sidebar. Each icon represents a category. Clicking a category reveals the corresponding navigation items in the adjacent panel (the existing sidebar area). This eliminates scrolling and organizes navigation into logical groups.

---

## Category Structure

The icon rail will contain these category icons (top to bottom):

| Icon | Category ID | Label | Contains |
|------|-------------|-------|----------|
| LayoutDashboard | home | Αρχική | My Work, Dashboard |
| Briefcase | work | Εργασίες | Projects, Tasks, Calendar (with Project Tree) |
| MessageSquare | comms | Επικοινωνία | Inbox, Chat |
| FileArchive | files | Αρχείο | Files |
| Timer | time | Χρόνος | Timesheets |
| Users | people | Ομάδα | Contacts, HR, Leaderboard |
| DollarSign | finance | Οικονομικά | Financials, Reports |
| Settings | admin | Διαχείριση | Clients, Blueprints, Settings |

The active category is determined either by: (a) user click, or (b) auto-detected from current route. The selected category icon gets a highlight (bg-accent or pill indicator).

---

## Layout Change

```text
BEFORE:
+------------------+
| Logo + Collapse  |
| Nav Item 1       |
| Nav Item 2       |
| ...scroll...     |
| Nav Item N       |
| Secretary / New  |
| User Menu        |
+------------------+

AFTER:
+----+-------------+
|Icon| Logo        |
|    |             |
| H  | My Work     |
| W  | Dashboard   |
| C  |             |
| F  |             |
| T  |             |
| P  |             |
| $  |             |
|    | Secretary   |
| S  | New...      |
|    | Theme       |
|User| User Menu   |
+----+-------------+
```

The icon rail is ~48px wide with a slightly darker background. The right panel shows only the items for the selected category -- no scrolling needed.

When the sidebar is **collapsed**, only the icon rail is visible (same as current collapsed behavior but now with category icons instead of all nav icons). When a category is clicked in collapsed mode, the sidebar expands to show that category's items.

---

## Behavior Details

- **Active category auto-detection**: Based on current route, the matching category highlights automatically (e.g., `/inbox` highlights "comms")
- **Persist selected category**: Store in state (not localStorage -- ephemeral, auto-detected is enough)
- **Collapsed mode**: Only the icon rail shows. Clicking an icon expands sidebar and selects that category
- **Mobile**: Keep current Sheet behavior but add the icon rail inside the sheet
- **Bottom items on rail**: Logo at top, Settings icon at bottom of rail, user avatar at very bottom

---

## Technical Details

### Modified Files

| File | Changes |
|------|---------|
| `src/components/layout/AppSidebar.tsx` | Major refactor: add category definitions, icon rail component, category-based filtering of nav items, auto-detection logic |

### Implementation in AppSidebar.tsx

1. **Define categories array** mapping category IDs to icons, labels, route prefixes (for auto-detect), and which nav items belong to each

2. **Add `activeCategory` state** initialized by route detection

3. **Add `IconRail` component** rendered as a narrow flex column on the left of the sidebar content:
   - Logo icon at top
   - Category icons in the middle (with tooltip on hover showing category name)
   - Theme toggle icon and user avatar at bottom
   - Active category gets a pill/highlight indicator

4. **Filter displayed nav items** based on `activeCategory` -- only render the items belonging to the selected category in the right panel

5. **Wrap sidebar content** in a horizontal flex: `flex flex-row` with icon rail on left and existing content panel on right

6. **Collapsed behavior**: When collapsed, only the icon rail is visible (width ~48px). The category panel hides. Clicking a category icon expands the sidebar.

### Route-to-Category Mapping

```text
/my-work, /         -> home
/work, /projects/*, /tasks/* -> work
/inbox, /chat       -> comms
/files              -> files
/timesheets         -> time
/contacts, /hr, /leaderboard -> people
/financials, /reports -> finance
/clients, /blueprints, /settings -> admin
```

### Visual Design

- Icon rail background: `bg-sidebar` or slightly darker than sidebar (`bg-card/80` with a subtle right border)
- Active category: small rounded pill behind icon (`bg-accent`) or a left border indicator
- Icons: 20px, `text-muted-foreground`, active = `text-foreground`
- Tooltip on hover for each category icon (using existing Tooltip component)
- Smooth transition when switching categories
