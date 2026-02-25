
# Executive Dashboard Layer -- Structured Overview Refactor

## Summary

Replace the current flat "widget board" Dashboard with a structured **Executive Layer** containing 4 predefined dashboard templates (Executive, Finance, Operations, Sales & Pipeline) plus user-created Custom Dashboards. Each dashboard follows a strict 4-zone layout system (Health, Trends, Workload, Attention) with controlled widget placement.

## Architecture

```text
Overview (sidebar category)
  |-- Executive Dashboard (default)
  |-- Finance Dashboard
  |-- Operations Dashboard
  |-- Sales & Pipeline Dashboard
  |-- Custom Dashboards (user-created copies)
```

The sidebar "overview" category will show sub-links for each dashboard type. Selecting one loads the corresponding template with its zone layout.

---

## Technical Plan

### 1. New: Dashboard Template Registry

**File: `src/components/dashboard/dashboardTemplates.ts`**

Define the 4 templates, each with 4 zones (A/B/C/D) and the widget IDs assigned to each zone, including allowed sizes.

```typescript
type ZoneId = 'health' | 'trends' | 'workload' | 'attention';
type DashboardTemplateId = 'executive' | 'finance' | 'operations' | 'sales';

interface ZoneDefinition {
  id: ZoneId;
  label: string;
  maxWidgets: number;
  allowedSizes: WidgetSize[];
  gridClass: string; // e.g., "grid-cols-4" for health
}

interface TemplateDefinition {
  id: DashboardTemplateId;
  label: string;
  icon: LucideIcon;
  description: string;
  zones: Record<ZoneId, { widgets: string[] }>;
}
```

Template contents matching the spec:
- **Executive**: Revenue, Net Profit, Active Projects, Alerts Count / Revenue Trend + Project Progress / Utilization + Top Clients + Active Projects Breakdown / Overdue Tasks + Overdue Invoices
- **Finance**: Revenue, Recurring Revenue, Net Profit, Outstanding Invoices / Revenue Trend + Cost Breakdown / Margin by Client + Revenue by Service + Monthly Comparison / Overdue Invoices + Cost Variance
- **Operations**: Active Projects, Utilization, Overdue Tasks, Capacity / Project Progress + Hours Trend / Tasks by Status + Resource Allocation + Deadlines / SLA Breaches + High Workload
- **Sales**: Pipeline Value, Win Rate, Active Proposals, Closed Won / Pipeline Stages + Win Rate Trend / Proposals by Stage + Top Opportunities + Client Acquisition / Stalled Deals + Follow-up Required

### 2. New: Expanded Widget Registry

**File: `src/components/dashboard/widgetRegistry.ts`**

Add new widget definitions for the additional widgets needed by the templates. Many already exist; new ones include:
- `recurring_revenue`, `outstanding_invoices`, `capacity_pct`, `closed_won`
- `cost_breakdown_chart`, `margin_by_client`, `revenue_by_service`, `monthly_comparison`
- `tasks_by_status`, `resource_allocation`, `hours_trend_chart`
- `pipeline_stages_chart`, `win_rate_trend`, `top_opportunities`
- `sla_breaches`, `high_workload_warning`, `stalled_deals`, `followup_required`
- `top_clients_revenue`, `active_projects_breakdown`, `client_acquisition_trend`, `proposals_by_stage`, `cost_variance_alert`

Each widget will specify which zone(s) it belongs to and allowed sizes.

### 3. New: Zone Layout Component

**File: `src/components/dashboard/DashboardZone.tsx`**

A component that renders a single zone with:
- Zone title (small, muted uppercase label)
- Grid layout appropriate to zone type:
  - Zone A (Health): `grid-cols-2 lg:grid-cols-4`, max 4 items
  - Zone B (Trends): `grid-cols-1 lg:grid-cols-2`, max 2 items
  - Zone C (Workload): `grid-cols-1 md:grid-cols-3`, max 3 items
  - Zone D (Attention): `grid-cols-1 md:grid-cols-2`, max 2 items
- Visual separator (subtle border-bottom or spacing) between zones
- Drag-and-drop reordering WITHIN the zone only (using separate SortableContext per zone)
- Widget toggle on/off, resize within allowed sizes

### 4. New: Dashboard Selector Sub-Nav in Sidebar

**File: `src/components/layout/AppSidebar.tsx`**

Update the `categoryNavItems.overview` to include sub-links:
- Executive (default, `/dashboard/executive` or just `/`)
- Finance (`/dashboard/finance`)
- Operations (`/dashboard/operations`)
- Sales & Pipeline (`/dashboard/sales`)
- Custom (expandable, lists user-created dashboards)

### 5. Refactored: Dashboard Page

**File: `src/pages/Dashboard.tsx`**

Major refactor:
- Accept a `templateId` parameter (from route or sidebar selection)
- Load the template definition from the registry
- Render 4 `DashboardZone` components in sequence
- Each zone gets its own `DndContext` / `SortableContext` for within-zone reordering
- User preferences (toggle on/off, resize, reorder within zone) stored per template in localStorage
- Keep existing data fetching logic but extend with new data queries
- Time filter (Today/Week/Month/Year) and Client filter apply globally to all widgets
- Role-based default: map user role to default template

### 6. New: Widget Components for New Widgets

**File: `src/components/dashboard/widgets/` (multiple new files)**

Create placeholder/functional widgets for the new entries. Many will share patterns:
- **KPI widgets** (Zone A): Reuse `StatCard` with different data
- **Chart widgets** (Zone B): New Recharts-based components (e.g., `CostBreakdownChart`, `PipelineStagesChart`, `HoursLoggedChart`, `WinRateTrendChart`)
- **List/table widgets** (Zone C/D): Card-based lists showing top items, breakdowns, or alerts

Initially, widgets without real data will show placeholder/mock data with a clear empty state, as some data sources (recurring revenue, SLA breaches, etc.) may not exist yet in the database.

### 7. Updated: Custom Dashboard Management

**File: `src/components/dashboard/DashboardCustomizer.tsx`**

Refactor the customizer sheet to:
- Show widgets grouped by zone (not by category)
- Only show widgets belonging to the current template's zones
- Allow toggle and resize within zone constraints
- Add a "Duplicate as Custom" button to create a personal copy
- Custom dashboards saved in localStorage with unique names

### 8. New: Custom Dashboard CRUD

**File: `src/hooks/useDashboardConfig.ts`**

Extend the hook to:
- Support multiple template configs (keyed by template ID)
- Store per-template user preferences
- Support custom dashboard creation (duplicate from template)
- Support renaming, deleting custom dashboards
- Role-based default template selection

### 9. Routing Updates

**File: `src/App.tsx`**

Add routes:
- `/` or `/dashboard/executive` -- Executive Dashboard
- `/dashboard/finance` -- Finance Dashboard  
- `/dashboard/operations` -- Operations Dashboard
- `/dashboard/sales` -- Sales & Pipeline Dashboard
- `/dashboard/custom/:id` -- Custom Dashboard

---

## Design Rules Enforcement

- Zone A: Always top, max 4 KPIs, large stat cards only
- Zone B: Below health, max 2 wide charts, `col-span-2` each
- Zone C: Below trends, max 3 medium widgets
- Zone D: Bottom, max 2 medium widgets (alerts/risk themed)
- Consistent card heights within each zone (min-height per zone)
- Clear zone labels as subtle section dividers
- No cross-zone dragging -- each zone is an independent sortable context

## Files Summary

| Action | File |
|--------|------|
| Create | `src/components/dashboard/dashboardTemplates.ts` |
| Create | `src/components/dashboard/DashboardZone.tsx` |
| Create | `src/components/dashboard/widgets/CostBreakdownChart.tsx` |
| Create | `src/components/dashboard/widgets/HoursLoggedChart.tsx` |
| Create | `src/components/dashboard/widgets/PipelineStagesChart.tsx` |
| Create | `src/components/dashboard/widgets/WinRateTrendChart.tsx` |
| Create | `src/components/dashboard/widgets/TopClientsRevenue.tsx` |
| Create | `src/components/dashboard/widgets/TasksByStatus.tsx` |
| Create | `src/components/dashboard/widgets/AlertWidget.tsx` |
| Edit | `src/components/dashboard/widgetRegistry.ts` |
| Edit | `src/components/dashboard/DashboardCustomizer.tsx` |
| Edit | `src/components/dashboard/WidgetWrapper.tsx` |
| Edit | `src/hooks/useDashboardConfig.ts` |
| Edit | `src/pages/Dashboard.tsx` |
| Edit | `src/components/layout/AppSidebar.tsx` |
| Edit | `src/App.tsx` |
