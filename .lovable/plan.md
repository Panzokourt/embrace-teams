# Work Mode v2 — Πλήρης Αναβάθμιση

## Στόχος
Μετατροπή του Focus/Work Mode από read-only προβολή σε πλήρες, διαδραστικό workspace όπου ο χρήστης μπορεί να βλέπει, επεξεργάζεται και διαχειρίζεται όλη την πληροφορία ενός task χωρίς να φύγει από το focus view.

---

## 1. Inline Editing (click-to-edit)

**Νέο component**: `src/components/focus/sections/FocusEditableField.tsx`
- Generic wrapper για click-to-edit (text/textarea/select/date/number)
- Optimistic update + auto-save στο `tasks` table μέσω `supabase.from('tasks').update()`
- Invalidate React Query keys μετά το save
- Esc = cancel, Enter / blur = save

**Πεδία που γίνονται editable στο FocusOverlay**:
- Title (h1, click-to-edit)
- Description (textarea)
- Priority (select: low/medium/high/urgent)
- Status (select)
- Due date / Start date (date picker)
- Estimated hours (number)
- Progress (slider 0-100)
- Assignee (user picker)
- Task category

**Νέο context method** στο `FocusContext.tsx`:
- `updateCurrentTask(patch: Partial<FocusTask>)` → optimistic local + DB write + refresh.

---

## 2. Νέα Sections στο κέντρο

### a) `FocusSubtasksSection.tsx`
- Λίστα subtasks με checkbox toggle (status → completed/todo)
- Inline add (Enter για create)
- Inline rename, delete
- Priority badge με dropdown
- Realtime: subscribe σε `tasks` όπου `parent_task_id = currentTask.id`

### b) `FocusFilesSection.tsx` (Quick Access)
- Grid layout με thumbnails (image previews, icon για docs)
- Click = άνοιγμα στο `FilePreviewDialog` (υπάρχει ήδη)
- Drag-and-drop upload απευθείας στο task
- Download / delete actions
- Δείχνει size + type

### c) `FocusCommentsSection.tsx`
- Realtime feed comments (πίνακας `task_comments` ή αντίστοιχος — επιβεβαίωση schema)
- Inline composer με @ mentions
- Edit/delete own comments

### d) `FocusActivitySection.tsx` (collapsed by default)
- Audit trail: status changes, reassignments, due date changes
- Read από `tasks_history` ή derived από `updated_at` deltas

### e) `FocusTimeTrackingSection.tsx`
- Start/Stop timer button (συνδεδεμένο με Global Active Timer)
- Δείχνει σύνολο χρόνου & breakdown ανά session
- Quick "log time" inline form

---

## 3. Task-Aware AI Quick Chat

**Νέο component**: `src/components/focus/FocusAIChat.tsx`
- Floating panel (bottom-right) ή expandable drawer
- Καλεί τo υπάρχον `secretary-agent` Edge Function με injected context:
  ```typescript
  systemContext: {
    page: 'focus_mode',
    current_task: { id, title, description, status, priority, due_date, project_name, subtasks, files }
  }
  ```
- Streaming responses
- Quick action buttons: "Σύνοψη", "Πρότεινε υποβήματα", "Έλεγξε για blockers", "Γράψε update στο team"
- Voice input (επαναχρησιμοποίηση `VoiceInputButton`)
- Markdown rendering με `react-markdown`

**Edge function update**: `supabase/functions/secretary-agent/index.ts`
- Αναγνώριση `page === 'focus_mode'` → προσθήκη task context στο system prompt
- Νέο tool: `update_current_task(patch)` ώστε ο AI να μπορεί να επιβεβαιώσει αλλαγές

---

## 4. Up Next Sidebar — Readability + Resize

**Updates στο `FocusOverlay.tsx`**:
- Αφαίρεση `opacity-40` από τα sidebar tasks → χρήση `text-white/80` για κανονικά, `text-white/50` για secondary info
- Hover state πιο έντονο (bg-white/10)
- Current task highlighted με indicator (μπλε bar αριστερά)
- Priority dot indicator δίπλα στο title
- Δείχνει assignee avatar αν διαφορετικό από current user

**Νέο component**: `src/components/focus/FocusSidebarResizer.tsx`
- Drag handle (κάθετη γραμμή 4px) στο αριστερό edge του sidebar
- Range: 240px – 480px
- Persistence: `localStorage.setItem('focus-sidebar-width', px)`
- Cursor: `col-resize`
- Visual feedback κατά το drag (highlight)

---

## 5. Πρόσθετες Πληροφορίες (suggestions που εγκρίνονται)

### Στο header/properties:
- **Project link** (clickable → πλοήγηση στο project)
- **Client name** (αν υπάρχει)
- **Tags / labels**
- **Created by + created at**
- **Last updated** (relative time)

### Νέα section: **Dependencies**
- Blocks: tasks που εξαρτώνται από αυτό
- Blocked by: tasks που μπλοκάρουν αυτό
- Από `task_dependencies` table (αν υπάρχει — επιβεβαίωση)

### Νέα section: **Review Workflow** (αν `requires_review = true`)
- Reviewer info
- Approve / Request changes buttons
- Review history

### Keyboard shortcuts panel (`?` για άνοιγμα):
- `J` / `K` → next/prev task στο Up Next
- `E` → focus title για edit
- `D` → focus description
- `Space` → start/pause timer
- `C` → complete current task
- `S` → skip to next
- `/` → focus AI chat
- `Esc` → exit focus mode

---

## 6. Αρχιτεκτονική αλλαγών

### Νέα αρχεία (10):
1. `src/components/focus/sections/FocusEditableField.tsx`
2. `src/components/focus/sections/FocusTaskHeader.tsx` (μετατροπή του header σε editable)
3. `src/components/focus/sections/FocusSubtasksSection.tsx`
4. `src/components/focus/sections/FocusFilesSection.tsx`
5. `src/components/focus/sections/FocusCommentsSection.tsx`
6. `src/components/focus/sections/FocusTimeTrackingSection.tsx`
7. `src/components/focus/sections/FocusDependenciesSection.tsx`
8. `src/components/focus/FocusAIChat.tsx`
9. `src/components/focus/FocusSidebarResizer.tsx`
10. `src/components/focus/FocusKeyboardShortcuts.tsx`

### Edited:
- `src/components/focus/FocusOverlay.tsx` — composition των νέων sections, resizable sidebar, νέα readability
- `src/contexts/FocusContext.tsx` — `updateCurrentTask`, `refreshCurrentTask` methods
- `supabase/functions/secretary-agent/index.ts` — focus_mode context awareness + `update_current_task` tool

---

## 7. Επιβεβαιώσεις πριν υλοποίηση
- Schema check για `task_comments`, `task_dependencies`, `tasks_history` (αν λείπουν, θα τα παραλείψω ή προτείνω migration)
- RLS policies ήδη επιτρέπουν UPDATE από assignee/team — επιβεβαίωση μέσω `read_query`

---

## Υλοποίηση
Ξεκινάω με τη σειρά:
1. FocusContext extension + EditableField primitive
2. Editable header & properties
3. Subtasks & Files sections (high impact)
4. Sidebar readability + Resizer
5. AI Chat
6. Comments / Activity / Dependencies / Time Tracking
7. Keyboard shortcuts
8. Edge function context update
