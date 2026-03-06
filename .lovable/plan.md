

# Plan: Redesign Employee Profile — Client-style Card Layout

## Current State
The Employee Profile (`EmployeeProfile.tsx`) has a flat tab layout with minimal content in the Overview tab — just "Ομάδες" (which should be "Τμήμα") and Leave Balance. No stat cards, no rich overview. The Client Detail page uses a 12-column grid with a smart header and dedicated cards — that's the target aesthetic.

## Changes

### 1. Redesign Overview Tab — Card-based Layout

Replace the current empty overview with a rich grid layout:

**Top row — KPI stat cards** (4 mini cards):
- Ενεργά Έργα (count from `projects`)
- Ανοιχτές Εργασίες (count from `tasks` where status ≠ done)
- Ώρες Μήνα (sum `duration_minutes` from `time_entries` for current month)
- Υπόλοιπο Αδειών (sum from `balances`)

**Main grid (12-col like ClientDetail)**:

Left column (7 cols):
- **Στοιχεία Επικοινωνίας** card — Email, Phone, Hire Date (inline editable as already supported by EmployeeHeader)
- **Θέση & Τμήμα** card — Job title, Department, Role badge
- **Πρόσφατη Δραστηριότητα** card — Last 5 activity log entries

Right column (5 cols):
- **Έργα** card — List of projects with status badges (clickable → project detail)
- **Tasks Snapshot** card — Overdue / This Week / Open counts (reuse pattern from `ClientTasksSnapshot`)
- **Υπόλοιπο Αδειών** card — Compact leave balance

### 2. Fix "Ομάδες" → "Τμήμα"
Remove the Teams card. Show Department info in the new "Θέση & Τμήμα" card.

### 3. EmployeeHeader Cleanup
The header already works well with cover photo + avatar. Keep it as-is — it matches the client smart header pattern.

### 4. New Component: `EmployeeStatsCard.tsx`
Small reusable stat card (icon, number, label) used for the KPI row. Similar to the `StatCard` used in Dashboard.

### 5. Compute Stats in `EmployeeProfile.tsx`
Add computed values:
- `activeProjects` = projects with status ≠ completed
- `openTasks` = tasks where status ≠ done  
- `overdueTasks` = open tasks with due_date < now
- `monthlyHours` = sum of `duration_minutes` for current month from timeEntries
- `leaveBalance` = sum of remaining leave days

## Files

| File | Change |
|---|---|
| `src/pages/EmployeeProfile.tsx` | **Rewrite Overview tab** — KPI row + 12-col grid with cards. Compute stats. Remove teams references. |
| `src/components/hr/EmployeeStatsCard.tsx` | **New** — Mini stat card component (icon, value, label) |

No DB changes needed. All data is already fetched.

## Additional Feature Ideas (for follow-up)
- **Quick Actions** in header: Send Message, Assign to Project, Start Timer
- **Skills & Certifications** card in Overview
- **Attendance/Presence** indicator (online status from work day clock)
- **Notes/Comments** section for manager-to-employee notes
- **Performance Goals** card with progress tracking

