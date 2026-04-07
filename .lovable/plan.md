

# Quick Notes — Rich Text Editor Upgrade

## Τρέχουσα κατάσταση
Τα Quick Notes χρησιμοποιούν ένα απλό `<textarea>` για plain text. Δεν υπάρχει formatting, checklists, tables, ή attachments.

## Τι θα προσθέσουμε

Αντικατάσταση του textarea με **TipTap** rich text editor, προσθέτοντας:

### Formatting Toolbar (Apple Notes style)
Μια floating toolbar πάνω από τον editor:
- **Aa** — Heading styles (H1, H2, H3, paragraph)
- **Text formatting** — Bold, Italic, Strikethrough, Lists (bullet/ordered)
- **Table** — Εισαγωγή/επεξεργασία πινάκων
- **Checklist** — Interactive checkboxes (task lists)
- **Link** — Εισαγωγή/edit hyperlinks

### More Options Menu (... menu)
Επέκταση του υπάρχοντος dropdown με:
- **Pin Note** — Καρφίτσωμα σημείωσης στην κορυφή
- **Find in Note** — Αναζήτηση μέσα στη σημείωση
- **Delete Note** — Ήδη υπάρχει

### Database Changes
- Προσθήκη `is_pinned` boolean column στον πίνακα `quick_notes` (default false)
- Pinned notes εμφανίζονται πρώτα στη λίστα

## Τεχνική υλοποίηση

### TipTap Extensions
Εγκατάσταση packages:
- `@tiptap/react`, `@tiptap/starter-kit` — Core editor
- `@tiptap/extension-task-list`, `@tiptap/extension-task-item` — Checklists
- `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header` — Tables
- `@tiptap/extension-link` — Hyperlinks
- `@tiptap/extension-placeholder` — Placeholder text
- `@tiptap/extension-highlight` — Text highlight

### Content Format
- Αποθήκευση σε **HTML** στο `content` field (backward compatible — plain text εμφανίζεται ως-έχει)
- Αuto-save με debounce 500ms (ίδιο με τώρα)

### Νέα Components
- `NoteEditor.tsx` — TipTap editor wrapper με toolbar
- `NoteEditorToolbar.tsx` — Formatting buttons bar

## Files

| File | Αλλαγή |
|------|--------|
| `package.json` | Εγκατάσταση TipTap packages |
| `src/components/my-work/NoteEditor.tsx` | Νέο — TipTap editor + toolbar |
| `src/components/my-work/QuickNotes.tsx` | Αντικατάσταση textarea με NoteEditor, pin logic, enhanced menu |
| `src/index.css` | TipTap prose styles (tables, checklists, etc.) |
| Migration | `ALTER TABLE quick_notes ADD COLUMN is_pinned boolean DEFAULT false` |

