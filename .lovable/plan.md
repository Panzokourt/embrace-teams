

# Fix & Enhance Media Plan Workspace — 5 Issues

## Issues Identified

### Issue 3: "Add Action" fails
**Root cause**: DB has a CHECK constraint `media_plan_items_status_check` allowing only `planned`, `active`, `completed`, `cancelled`. The workspace code inserts `status: 'draft'` which violates it.

**Fix**: Migration to drop the old constraint and add a new one including all 9 statuses from `mediaConstants.ts`.

### Issue 4: Detail panel shows empty fields
**Root cause**: The `Input` components use controlled values like `value={item.title || ''}` which should work. However, the `onChange` handlers call `update()` on every keystroke, which triggers a DB update + refetch. This causes the input to lose focus and reset. Need to debounce or use local state.

**Fix**: Refactor detail panel fields to use local state with onBlur save pattern (like the existing `EditableCell` in `ProjectMediaPlan.tsx`).

### Issue 5: No inline editing in table
**Root cause**: `MediaPlanTable.tsx` renders static `<TableCell>` text — no editable cells.

**Fix**: Add inline editable cells for key fields (title, channel, placement, objective, status, priority, budget, dates, owner) using click-to-edit pattern.

### Issue 1: Excel upload + AI analysis
**New feature**: Add an "Import Excel" button that accepts `.xlsx`/`.csv` files, sends content to an edge function for AI parsing, and populates the media plan.

### Issue 2: AI generation wizard in standalone workspace
**New feature**: Port the AI generation wizard from `ProjectMediaPlan.tsx` to the standalone workspace, adapting it to work with standalone plans.

---

## Implementation Plan

### 1. Database Migration
- Drop `media_plan_items_status_check` constraint
- Add new constraint with all 9 statuses: `draft`, `planned`, `ready_for_production`, `in_production`, `ready_to_launch`, `live`, `completed`, `on_hold`, `cancelled`

### 2. Fix Detail Panel (MediaPlanDetailPanel.tsx)
- Wrap each input field with local state
- Save on `onBlur` instead of `onChange` for text inputs
- Keep `Select` components as instant-save (they don't have the focus issue)

### 3. Add Inline Editing to Table (MediaPlanTable.tsx)
- Replace static cells with click-to-edit `EditableCell` components for: title, placement, budget, dates, KPI
- Use inline `Select` for: channel, status, priority, objective, funnel, owner
- Respect `is_locked` state — disable editing for locked rows
- Stop row click propagation on editable cells (prevent opening detail panel when editing)

### 4. AI Generation Wizard (new: MediaPlanAIWizard.tsx)
- Create a dialog-based wizard extracted from `ProjectMediaPlan.tsx` logic
- Steps: Objectives, Audience, Channels, Budget Allocation, Phases
- Calls existing `generate-media-plan` edge function
- Works with standalone plans (uses plan's `project_id`, `total_budget`, etc.)
- Add "AI Generate" button to `MediaPlanHeader.tsx`

### 5. Excel Upload + AI Analysis (new: analyze-media-plan-excel edge function)
- New edge function `analyze-media-plan-excel` that:
  - Receives CSV/text content from parsed Excel files
  - Uses Lovable AI (gemini-2.5-flash) to extract structured media plan items
  - Returns parsed rows matching the media_plan_items schema
- Frontend: "Import Excel" button in header opens file picker
  - Parse `.xlsx`/`.csv` client-side (use basic CSV parsing for CSV, or read as text)
  - Send content to edge function for AI analysis
  - Show preview dialog (reuse `MediaPlanPastePreview` pattern) before inserting
  - Support multiple file selection

### Files to Create/Edit

| File | Action |
|------|--------|
| Migration SQL | Drop/recreate status check constraint |
| `MediaPlanDetailPanel.tsx` | Local state + onBlur save |
| `MediaPlanTable.tsx` | Inline editable cells |
| `MediaPlanAIWizard.tsx` | New — AI generation dialog |
| `MediaPlanHeader.tsx` | Add AI Generate + Import Excel buttons |
| `MediaPlanWorkspace.tsx` | Wire wizard + import flow |
| `supabase/functions/analyze-media-plan-excel/index.ts` | New edge function |

