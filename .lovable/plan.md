

# Plan: Files/Αρχεία — UI Fix, Preview, Drag & Drop, Move, Context Menu

## Issues & Solutions

### 1. Preview panel (right side) — truncated details
The preview panel is `w-[280px]` which clips long filenames and type labels. Fix: increase width to `w-[320px]`, use `break-words` on filename, truncate type with tooltip, ensure all detail rows wrap properly.

### 2. In-app file preview (not download)
Currently both "Λήψη" and "Προεπισκόπηση" call `handleDownload` which opens a new tab. Fix: create a **FilePreviewDialog** component:
- For images: render `<img>` with the signed URL
- For PDFs: render `<iframe>` with signed URL
- For video/audio: render `<video>`/`<audio>` tags
- For other types: show "Preview not available" + download button
- Trigger via "Προεπισκόπηση" button + keyboard **Space** press when a file is selected
- Dialog uses full-screen overlay with close button

### 3. External drag & drop (from OS)
Already partially implemented (`onDragOver`/`onDrop` on columns handles `e.dataTransfer.files`). Need to:
- Add a **global drop zone overlay** on the entire FinderColumnView — when dragging from OS, show a full-area overlay "Αφήστε αρχεία εδώ"
- Ensure the drop target resolves to the correct folder based on which column receives the drop

### 4. Internal drag & drop — move files/folders between folders
New functionality:
- Make file/folder rows **draggable** (`draggable="true"`)
- On drag start, store the item type + ID in `dataTransfer`
- On drop onto a folder row or column, call `onMoveFile(fileId, targetFolderId)` or a new `onMoveFolder(folderId, targetFolderId)` prop
- Visual feedback: highlight target folder on dragover
- Add `onMoveFolder` prop to `FinderColumnView` (and wire in `CentralFileExplorer`)

### 5. Context menu (right-click)
Add a **ContextMenu** (from shadcn/ui) on file and folder rows:
- **Files**: Λήψη, Προεπισκόπηση, Μετονομασία, Μετακίνηση σε…, Διαγραφή
- **Folders**: Ανέβασμα αρχείου, Νέος υποφάκελος, Μετονομασία, Διαγραφή
- **Empty area**: Ανέβασμα αρχείου, Νέος φάκελος
- Reuse existing handler functions, add rename file support

## Files to Create/Edit

| File | Action |
|------|--------|
| `src/components/files/FilePreviewDialog.tsx` | **New** — modal for in-app file preview (img/pdf/video/audio) |
| `src/components/files/FinderColumnView.tsx` | Fix preview panel width, add Space key handler, internal DnD for files/folders, context menus on rows, global OS drop overlay |
| `src/components/files/CentralFileExplorer.tsx` | Add `onMoveFolder` handler, wire `FilePreviewDialog` |

## Implementation Details

- **FilePreviewDialog**: Uses shadcn `Dialog` with `DialogContent` set to `max-w-[90vw] max-h-[90vh]`. Gets a signed URL via `supabase.storage.from('project-files').createSignedUrl()`. Renders content based on MIME type.
- **Space key**: Add `onKeyDown` listener on the FinderColumnView container — when Space is pressed and a file is selected, open preview dialog.
- **Internal DnD**: Use native HTML5 drag/drop (not dnd-kit) to keep it simple. Set `dataTransfer.setData('application/x-file-id', id)` on drag start. On folder drop, check for this data type first (before checking `dataTransfer.files` for OS drops).
- **Context menu**: Use shadcn `ContextMenu` component wrapping each row. Different menu items for files vs folders vs empty areas.
- **Move folder**: New DB update `file_folders` set `parent_folder_id` = target. Wire through props.

