

# Plan: Streamline Permissions in Invitation & Enhance Members Table

## Problem Summary

1. **InviteUserDialog** shows 12 permission categories with ~41 individual checkboxes — too granular for an invitation. Should be simplified but **kept**.
2. **CreateUserDialog** has the same overwhelming permissions accordion.
3. **OrganizationSettings Members table** is minimal — no job title, department, phone; rows aren't clickable; no proper action menu.
4. **HR Staff vs Org Settings Members** — both show members but with different actions. Need clear differentiation.

## Changes

### 1. Simplify Permissions UI in InviteUserDialog & CreateUserDialog

Replace the 12-category, 41-checkbox accordion with a **module-level toggle** approach:

| Module | Controls | Maps to permissions |
|---|---|---|
| Clients | View / Manage | `clients.view`, `clients.create/edit/delete` |
| Projects | View / Manage | `projects.view`, `projects.create/edit/delete` |
| Tasks | View / Manage / Assign | `tasks.*` |
| Deliverables | View / Manage / Approve | `deliverables.*` |
| Finance | View / Manage | `financials.*` |
| Reports | View / Export | `reports.*` |
| Tenders | View / Manage | `tenders.*` |
| Files | View / Upload / Delete | `files.*` |
| Settings | Company / Billing / Security | `settings.*` |
| Users | View / Invite / Edit / Suspend | `users.*` |

Each module gets a **row** with toggle switches for "View" and "Manage" (which auto-enables all CRUD permissions for that module). This replaces the accordion with a clean, compact table.

The underlying `PERMISSION_CATEGORIES` and DB model stay the same — only the UI is simplified. Role selection auto-sets the toggles (as it does now). User can override.

**Files**: `InviteUserDialog.tsx`, `CreateUserDialog.tsx` — replace accordion with compact permission table component. Extract shared `PermissionModuleSelector` component.

### 2. Remove Client/Project Assignment from Invitation

Keep access scope (company vs assigned) but **remove** the client/project checkbox lists from the invitation dialog. These are configured post-onboarding via EditPermissionsDialog. Invitation should be lightweight: Email → Role → Access Scope → Module permissions → Send.

### 3. Enhance OrganizationSettings Members Table

- Add columns: **Θέση**, **Τμήμα**, **Τηλέφωνο**
- Fetch `job_title`, `department`, `phone` from profiles alongside roles
- Make user name/avatar **clickable** → navigates to `/hr/employee/:userId`
- Replace "Αναστολή/Ενεργοποίηση" button with a **dropdown menu** (MoreHorizontal): "Προβολή Προφίλ", "Δικαιώματα", "Αναστολή/Ενεργοποίηση"
- Open `EditPermissionsDialog` from the dropdown

**Files**: `OrganizationSettings.tsx` — update table, add profile data fetching, add navigation + action menu. Update `useRBAC.ts` `CompanyUser` type to include `job_title`, `department`, `phone`.

### 4. Align HR Staff and Org Settings

- **Org Settings Members** = role/access/permissions management (admin focus)
- **HR Staff** = employee profiles, departments, org chart, leaves (HR focus)
- Both link to the same `/hr/employee/:id` profile page
- Ensure the profile page has a "Δικαιώματα" tab for editing permissions (add it)

**Files**: `EmployeeProfile.tsx` — add a "Δικαιώματα" tab that shows the `EditPermissionsDialog` content inline (for admins only).

### 5. New Shared Component

Create `src/components/users/PermissionModuleSelector.tsx` — compact module-level permission toggles used by both InviteUserDialog, CreateUserDialog, and EmployeeProfile permissions tab.

## File Summary

| File | Change |
|---|---|
| `src/components/users/PermissionModuleSelector.tsx` | **New** — Shared compact permission UI |
| `src/components/users/InviteUserDialog.tsx` | **Simplify** — Use PermissionModuleSelector, remove client/project lists |
| `src/components/users/CreateUserDialog.tsx` | **Simplify** — Use PermissionModuleSelector, remove permissions accordion |
| `src/pages/OrganizationSettings.tsx` | **Enhance** — Add columns, clickable rows, action dropdown, EditPermissionsDialog |
| `src/hooks/useRBAC.ts` | **Update** — Extend CompanyUser with job_title/department/phone, update fetchUsers |
| `src/pages/EmployeeProfile.tsx` | **Update** — Add "Δικαιώματα" tab for admins |

No DB changes needed.

