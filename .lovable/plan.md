

# Unified Page Header Structure & Breadcrumbs

## Problem Summary

Every page uses a different header layout:
- **Dashboard**: `text-2xl font-semibold`, no icon box, no breadcrumbs
- **Projects/Tasks**: `text-2xl font-semibold` with 40px icon box, subtitle at `ml-[52px]`
- **Clients**: `text-2xl font-semibold` with 40px icon box, different subtitle alignment
- **Financials/HR**: `text-3xl font-bold` with icon (no box), different subtitle style
- **Reports**: `text-2xl font-semibold` with inline icon, no box
- **Calendar**: `text-lg font-bold`, inline with filter tabs
- **Contacts**: `text-2xl font-bold` with muted box, no subtitle padding
- **Knowledge**: `text-2xl font-bold` with inline icon
- **ComingSoonPage**: `text-3xl font-bold`

No page has breadcrumbs. Tab placement, button positioning, and search/filter alignment vary everywhere.

## Solution

### 1. Create a Shared `PageHeader` Component

**New file: `src/components/shared/PageHeader.tsx`**

A reusable component that enforces consistent structure across all pages:

```
[Breadcrumbs - small text, muted]
[Icon] Title                    [View Toggle] [Action Button]
        Subtitle
[Tab Menu - if applicable]
[Search & Filters toolbar - if applicable]
```

Props:
- `icon`: LucideIcon
- `title`: string
- `subtitle?`: string
- `breadcrumbs`: array of `{ label, href? }` -- auto-generated from route or passed manually
- `actions?`: ReactNode (for buttons like "New Project", view toggles)
- `tabs?`: ReactNode (for TabsList)
- `toolbar?`: ReactNode (for search, filters, etc.)
- `children?`: ReactNode (any extra content below header)

Design rules:
- Title: always `text-xl font-semibold` (not 2xl or 3xl -- slightly smaller for consistency)
- Icon: 36px box with `rounded-xl bg-muted` container
- Subtitle: `text-sm text-muted-foreground`, no left margin trick
- Breadcrumbs: `text-xs text-muted-foreground/60` above the title, using the existing Breadcrumb UI components
- Consistent padding: `px-6 pt-4 pb-0` (the page body below uses its own spacing)

### 2. Create Breadcrumb Config

**New file: `src/utils/breadcrumbConfig.ts`**

A route-to-breadcrumb mapping so that each page auto-generates breadcrumbs from the current path:

- `/` -> `Dashboard`
- `/work` -> `Work > Projects` or `Work > Tasks`
- `/financials` -> `Financials > [active tab]`
- `/clients` -> `Clients`
- `/clients/:id` -> `Clients > [client name]`
- `/projects/:id` -> `Work > Projects > [project name]`
- `/calendar` -> `Calendar`
- `/hr` -> `HR > [active tab]`
- `/reports` -> `Reports > [active tab]`
- `/knowledge` -> `Knowledge Base`
- `/settings/*` -> `Settings > [sub-page]`
- `/governance/*` -> `Governance > [sub-page]`

### 3. Apply `PageHeader` to All Pages

Each page will replace its custom header with `<PageHeader>`. Pages affected:

| Page | Current Title Style | Changes |
|------|-------------------|---------|
| `Dashboard.tsx` | 2xl semibold | Add breadcrumbs, use PageHeader |
| `Projects.tsx` (via Work) | 2xl semibold + icon box | Use PageHeader, move view toggle + create button to `actions` |
| `Tasks.tsx` (via Work) | 2xl semibold + icon box | Same as Projects |
| `Clients.tsx` | 2xl semibold + icon box | Use PageHeader |
| `Contacts.tsx` | 2xl bold + muted box | Use PageHeader |
| `Financials.tsx` | 3xl bold + inline icon | Use PageHeader, tabs go to `tabs` prop |
| `HR.tsx` | 3xl bold + icon box | Use PageHeader |
| `Reports.tsx` | 2xl semibold + inline icon | Use PageHeader |
| `Timesheets.tsx` | 2xl semibold + icon box | Use PageHeader |
| `CalendarHub.tsx` | lg bold, inline | Use PageHeader |
| `Knowledge.tsx` | 2xl bold + inline icon | Use PageHeader |
| `ComingSoonPage.tsx` | 3xl bold | Use PageHeader |
| `Governance.tsx` | Check and unify | Use PageHeader |
| `Settings.tsx` | Check and unify | Use PageHeader |

### 4. Consistent Page Shell

Each page currently has different padding (`p-6 lg:p-8`, `p-4 md:p-6`, `p-6`, etc.). We'll standardize:

- All pages: `<div className="page-shell">` where `.page-shell` applies `p-6 space-y-5`
- The `PageHeader` sits inside this shell at the top
- Content follows with consistent gap

### 5. Tab Menu Consistency

Tabs currently appear at different levels -- some inline with title, some below. Standard:

- Tabs always render **below** the title row, as a separate horizontal band
- Same `TabsList` styling everywhere (already mostly consistent via the UI component)
- On pages with many tabs (Financials has 6, HR has 5), tabs wrap with `flex-wrap`

### 6. Action Button Consistency

- Primary action button (e.g., "New Project", "New Client") always on the **right side** of the title row
- View toggle (Cards/Table/Kanban) also on the right, before the primary button
- Style: primary button with `Plus` icon for create actions

## Technical Details

### PageHeader Component Structure

```tsx
function PageHeader({ icon: Icon, title, subtitle, breadcrumbs, actions, tabs, toolbar }) {
  return (
    <div className="space-y-3">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList className="text-xs">
          <BreadcrumbItem><BreadcrumbLink href="/">Dashboard</BreadcrumbLink></BreadcrumbItem>
          {breadcrumbs.map(...)}
        </BreadcrumbList>
      </Breadcrumb>
      
      {/* Title row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      
      {/* Tabs */}
      {tabs}
      
      {/* Toolbar (search, filters) */}
      {toolbar}
    </div>
  );
}
```

### Files to Create
- `src/components/shared/PageHeader.tsx`
- `src/utils/breadcrumbConfig.ts`

### Files to Modify (header replacement)
- `src/pages/Dashboard.tsx`
- `src/pages/Projects.tsx`
- `src/pages/Tasks.tsx`
- `src/pages/Clients.tsx`
- `src/pages/Contacts.tsx`
- `src/pages/Financials.tsx`
- `src/pages/HR.tsx`
- `src/pages/Reports.tsx`
- `src/pages/Timesheets.tsx`
- `src/pages/CalendarHub.tsx`
- `src/pages/Knowledge.tsx`
- `src/pages/placeholder/ComingSoonPage.tsx`
- `src/pages/Work.tsx` (minor -- ensure padding consistency)

### CSS Addition
- Add `.page-shell` utility class in `src/index.css`: `@apply p-6 space-y-5`

