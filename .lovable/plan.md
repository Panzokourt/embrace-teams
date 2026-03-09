

# Fixes: Avatar-only στον πίνακα, Multi-assignee popover, Inline title edit

## 3 αλλαγές

### 1. Στήλη Υπεύθυνος — μόνο Avatar (χωρίς όνομα)
**Αρχείο**: `src/components/shared/EnhancedInlineEditCell.tsx`

Στο `avatar-select` SelectTrigger (line 180): αφαίρεση `<span className="truncate">{selectedOption.label}</span>` — εμφάνιση μόνο Avatar. Tooltip με το όνομα.

### 2. Click σε assignee → Popover με λεπτομέρειες + προσθήκη ατόμων
**Αρχείο**: `src/components/tasks/TasksTableView.tsx`

Αντικατάσταση του `EnhancedInlineEditCell` στη στήλη assignee (lines 545-555) με custom Popover component:
- Trigger: Avatar (ή placeholder icon)
- Popover content: εμφάνιση τρέχοντος assignee, search input για users, λίστα suggested people, κλικ για assign/unassign
- `onSave` καλεί `onInlineUpdate` για `assigned_to`

Θα γίνει inline στο `TasksTableView` χωρίς νέο component — Popover με user list, search, και assign action.

### 3. Inline title edit στο TaskDetail (αντί prompt)
**Αρχείο**: `src/pages/TaskDetail.tsx` (lines 359-368)

Αντικατάσταση `prompt()` με inline editing:
- State: `editingTitle` boolean, `titleDraft` string
- Click → εμφάνιση Input αντί h1
- Enter → save (updateField), Escape → cancel
- onBlur → save

