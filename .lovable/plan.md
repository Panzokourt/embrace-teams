

# Secretary AI — Major Upgrade Plan

## Problems Identified

1. **Navigation links don't work properly** — `ActionRenderer` uses `navigate()` but when Secretary is in the right panel, navigation happens without keeping the panel open. The panel closes on route change.
2. **Project creation fails** — The `create_project` trigger `auto_create_project_folders` needs `created_by` which is set on the project, but the Secretary inserts without it (no `created_by` field in the insert). This causes `null value in column created_by` errors.
3. **Duplicate client creation** — The AI doesn't check for existing clients before creating new ones.
4. **Limited interactive elements** — Only buttons, confirm, link, select exist. No inline text input, number input, or rich content rendering.
5. **No rich content in chat** — Cannot display tables, images, charts, or file previews inline.
6. **AI model not the strongest** — Currently uses `gemini-3-flash-preview`; user wants the most powerful model.
7. **Large file handling** — 20MB limit on client uploads; no chunked processing.

## Implementation Plan

### Batch A: Fix Core Issues + Upgrade Model

**1. Fix `create_project` in edge function** — Add `created_by: userId` to the project insert so the folder trigger works.

**2. Fix navigation + panel persistence** — In `ActionRenderer`, when a link is clicked:
  - Dispatch a custom event `secretary-navigate` with the target path
  - In `AppLayout`, listen for this event: call `navigate(path)`, then force the Secretary panel open with the same tab

**3. Upgrade AI model** — Switch from `google/gemini-3-flash-preview` to `google/gemini-2.5-pro` for the main agent loop. This is the strongest available model for complex reasoning and tool calling. Keep `gemini-3-flash-preview` for `smart_project_plan` sub-calls (speed-sensitive).

**4. Increase tool loop iterations** — Bump from 5 to 8 to allow more complex multi-step workflows.

### Batch B: Rich Interactive Chat Elements

**5. Expand ActionRenderer with new block types:**

| Block Type | Syntax | Renders |
|-----------|--------|---------|
| `:::input` | `{"type":"text","label":"Όνομα","field":"name"}` | Inline text Input with submit |
| `:::input` | `{"type":"number","label":"Budget","field":"budget"}` | Inline number Input |
| `:::table` | `{"headers":[...],"rows":[[...],...]}` | Styled Table component |
| `:::image` | `{"url":"...","alt":"..."}` | Image preview |
| `:::chart` | `{"type":"bar","data":[...],...}` | Recharts mini chart (bar/pie/line) |
| `:::file` | `{"name":"...","url":"...","size":...}` | File card with download link |
| `:::progress` | `{"label":"...","value":75}` | Progress bar |

- Update the regex parser to handle these new block types
- Create sub-components: `InputBlock`, `TableBlock`, `ImageBlock`, `ChartBlock`, `FileBlock`, `ProgressBlock`
- `InputBlock` renders an Input + Send button; on submit sends `"field_name: value"` as a message

**6. Update system prompt** — Instruct the AI to use these new block types in responses:
  - Use `:::table` when showing lists of tasks, projects, clients
  - Use `:::input` when asking for user input (text, numbers)
  - Use `:::progress` when showing project/task progress
  - Use `:::chart` for financial/performance data

### Batch C: Large File Support

**7. Chunked file upload** — For files > 20MB:
  - Split file on client side into chunks (5MB each)
  - Upload each chunk to storage bucket sequentially
  - Reassemble on edge function or reference the full path
  - For AI analysis of large files: extract text/CSV content client-side, send in batches to the edge function

**8. File analysis in Secretary** — Add a `analyze_uploaded_file` tool:
  - Receives file content (text extracted client-side for CSV/text, or storage path for binary)
  - For CSV/Excel: parse and summarize, return structured data
  - For text/docs: summarize content
  - Display results using `:::table` blocks

### Files to Create/Edit

| File | Changes |
|------|---------|
| `supabase/functions/secretary-agent/index.ts` | Fix `created_by`, upgrade model to `gemini-2.5-pro`, update system prompt with new block types, bump loop to 8, add `analyze_uploaded_file` tool |
| `src/components/secretary/ActionRenderer.tsx` | Add `InputBlock`, `TableBlock`, `ImageBlock`, `ChartBlock`, `FileBlock`, `ProgressBlock` components; expand regex parser |
| `src/components/layout/AppLayout.tsx` | Listen for `secretary-navigate` event to persist panel on navigation |
| `src/components/secretary/SecretaryChat.tsx` | Add chunked file upload logic for large files, pass file content to edge function |
| `src/components/secretary/MentionInput.tsx` | Update file size limit to allow larger files |

### Implementation Order

1. **Batch A** first (fixes + model upgrade) — critical bugs
2. **Batch B** (rich interactive elements) — major UX improvement  
3. **Batch C** (large files) — enhancement

Estimated: 2-3 implementation rounds.

