

# Project Detail Page -- Corrections

## Changes Overview

1. **Remove progress bars** from both the sticky header and the deliverables tab area
2. **Restore top-level tabs** including Tasks as a tab alongside Deliverables (like the original layout)
3. **Team card: show full names** with visible Lead and Account Manager roles (assignable)
4. **Merge "Σύνοψη" and "Λεπτομέρειες"** into a single card at the top of the right sidebar, including tracked hours
5. **Remove AI Analysis card** entirely
6. **Remove the two buttons** (+Task, +Παραδοτέο) from the sticky header top-right

---

## Detailed Changes

### File: `src/pages/ProjectDetail.tsx`

**1. Sticky Header -- Remove buttons and progress bar**
- Remove the `+ Task` and `+ Παραδοτέο` buttons from the header right side
- Remove the progress bar and percentage display from the header
- Keep: project name, status dropdown, folder dropdown, client, date range, days remaining, timer badge

**2. Restore top-level Tabs**
- Replace the current layout (TasksPage always visible + secondary tabs below) with a proper `Tabs` component
- Tab items: **Παραδοτέα** | **Tasks** | **Αρχεία** | **Media Plan** | **Δημιουργικά** | **Οικονομικά** | **Σχόλια**
- Tasks tab renders embedded `TasksPage`
- Deliverables tab renders `ProjectDeliverablesTable` (without the progress summary row that currently shows "Πρόοδος: 0/3 παραδοτέα 0%")
- Other tabs render existing components as before

**3. Right sidebar -- Merge Summary + Details into one card**
- Combine "Σύνοψη" and "Λεπτομέρειες" into a single card titled "Πληροφορίες Έργου"
- Content order:
  - Description (inline editable)
  - Client (display)
  - Budget (inline editable)
  - Agency Fee (inline editable)
  - Start date / End date (inline date pickers)
  - Days remaining
  - Tracked hours (moved here from header -- keep the timer badge in header too for quick glance)
  - Tasks: X/Y completed (text only, no progress bar)
  - Deliverables: X/Y completed (text only, no progress bar)
- No progress bars anywhere in this card

**4. Team card -- Full names + Lead/Account Manager**
- Replace avatar-only compact display with a list showing full names
- Each member row: Avatar + Full Name + Role badge
- Add two special role designators at the top:
  - **Project Lead** -- selectable from team members
  - **Account Manager** -- selectable from team members
- These are stored as metadata on the `project_user_access` table (or a new field on the project itself)
- Display Lead and Account Manager prominently at the top of the team card with their names

**5. Remove AI Analysis**
- Remove the entire collapsible AI Analysis card from the right sidebar
- Remove related state variables (`aiFiles`, `aiRawFiles`, `aiOpen`) and handler functions
- Remove `useDocumentParser` import and usage

---

## Technical Details

### Database Change

Add two columns to the `projects` table for Lead and Account Manager:

```sql
ALTER TABLE projects ADD COLUMN project_lead_id uuid REFERENCES profiles(id);
ALTER TABLE projects ADD COLUMN account_manager_id uuid REFERENCES profiles(id);
```

This approach stores the lead/account manager at the project level rather than on team access records, making it simpler to query and display.

### Team Card Layout (New)

```text
+----------------------------------+
| Ομάδα Έργου          [Προσθήκη] |
|                                  |
| Project Lead:                    |
| [Avatar] Πέτρος Νικολάου  [▼]   |
|                                  |
| Account Manager:                 |
| [Avatar] Σοφία Μαυρίδου   [▼]   |
|                                  |
| Μέλη:                            |
| [Avatar] Μαρία Παπαδοπούλου      |
| [Avatar] Γιώργος Νικολάου        |
| [Avatar] Δημήτρης Αλεξίου        |
+----------------------------------+
```

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/ProjectDetail.tsx` | Remove header buttons and progress; restore top-level tabs with Tasks tab; merge Summary+Details cards; remove AI block; update team card usage |
| `src/components/projects/ProjectTeamManager.tsx` | Update compact mode to show full names instead of avatar-only; add Lead/Account Manager display and selection dropdowns |

### Removed Code
- AI Analysis collapsible card and all related state/handlers
- `useDocumentParser` hook usage
- `ProjectAISuggestions` import
- Progress bars from summary card
- `+ Task` and `+ Παραδοτέο` buttons from header
