

# Plan: My Work as Default Page, Sidebar Changes & Quick Notes

## 1. Make My Work the default route (`/`)

- **`src/App.tsx`**: Change `<Route path="/" element={<Dashboard />} />` to render `<MyWork />`. Move Dashboard to `/dashboards` and `/dashboards/:templateId`.
- **`src/components/layout/AppSidebar.tsx`**: 
  - Add a dedicated **My Work** icon button at the **top of the Icon Rail** (above all categories, below logo), navigating to `/`.
  - Rename the `overview` category label from "Overview" to "Dashboards".
  - Update `categoryNavItems.overview` hrefs from `/` → `/dashboards`, `/dashboard/finance` → `/dashboards/finance`, etc.
  - Update `categories` routePrefixes: remove `/` from overview, add `/` to work (or handle separately since My Work is now standalone in the rail).
  - Update `detectCategory` to map `/` to a special "my-work" standalone (or simply route to `work` category).

## 2. Rename "Overview" → "Dashboards"

- In `categories` array: change `label: 'Overview'` to `label: 'Dashboards'`, keep `id: 'overview'`.
- Update routePrefixes to `['/dashboards']`.

## 3. Quick Notes Feature

### Database
- New table `quick_notes` with columns: `id`, `user_id` (references auth.users), `company_id`, `title`, `content` (text/HTML), `date` (date, defaults to today), `linked_entity_type` (nullable: project/task/deliverable/meeting), `linked_entity_id` (nullable uuid), `created_at`, `updated_at`.
- RLS: users can only CRUD their own notes.

### UI Component (`src/components/my-work/QuickNotes.tsx`)
- macOS Notes-inspired layout: left panel with note list (grouped by date), right panel with rich text editor.
- Create/delete notes, search notes.
- Each note has a toolbar with AI actions: "Convert to Task", "Convert to Deliverable", "Link to Project", "Create Meeting".
- Bulk AI action: select multiple notes → AI processes them into structured items.

### AI Edge Function (`supabase/functions/notes-ai-action/index.ts`)
- Takes note content + action type (create_task, create_deliverable, link_project, create_meeting).
- Uses Lovable AI to extract structured data (title, description, dates, priority) from note text.
- Returns structured suggestion for user confirmation before creating.

### Integration in My Work
- Add a new section/card in the My Work page below existing content or as a toggleable panel.
- Collapsible card with title "Quick Notes" and a notebook icon.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/App.tsx` | Change `/` to MyWork, move Dashboard to `/dashboards` |
| `src/components/layout/AppSidebar.tsx` | Add My Work to rail top, rename Overview→Dashboards, update routes |
| `src/components/my-work/QuickNotes.tsx` | **New** — macOS-style notes UI |
| `supabase/functions/notes-ai-action/index.ts` | **New** — AI processing of notes |
| `src/pages/MyWork.tsx` | Add QuickNotes section |
| Migration SQL | Create `quick_notes` table with RLS |

