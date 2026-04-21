
## Στόχος

Θα προσθέσουμε **desktop-style multi-select** στο Finder-style Files explorer, ώστε ο χρήστης να μπορεί να επιλέγει πολλά αρχεία/φακέλους και να κάνει μαζικές ενέργειες όπως στο macOS/Windows:

- Click: επιλέγει ένα item.
- Shift + click: επιλέγει συνεχόμενο εύρος μέσα στην ίδια στήλη.
- Ctrl/Cmd + click: προσθέτει/αφαιρεί μεμονωμένα items από την επιλογή.
- Escape: καθαρίζει την επιλογή.
- Drag επιλεγμένων items: μετακινεί όλο το selection μαζί.
- Context menu σε selection: εμφανίζει μαζικές ενέργειες.

## Τι θα αλλάξει στο UI

### 1) Οπτική ένδειξη επιλογής πολλών items

Στο `FinderColumnView` κάθε row (folder/file) θα μπορεί να εμφανίζεται ως:

- απλά selected item: έντονο primary background όπως τώρα
- multi-selected item: primary background + πιο καθαρό ring/left accent
- drilled folder: θα συνεχίσει να δείχνει ότι είναι ανοιχτός στο path, αλλά δεν θα συγχέεται με το multi-selection

Για παράδειγμα, αν επιλεγούν 8 φάκελοι/αρχεία, θα φαίνονται όλοι highlighted.

### 2) Bulk action bar στο πάνω μέρος του explorer

Όταν υπάρχουν πάνω από 1 επιλεγμένα items, στο toolbar του `FinderColumnView` θα εμφανίζεται μικρή μπάρα:

```text
8 επιλεγμένα    [Μετακίνηση σε…] [Λήψη αρχείων] [Διαγραφή] [Καθαρισμός]
```

Προσαρμογή ανά τύπο επιλογής:

- Αν υπάρχουν μόνο αρχεία:
  - Προεπισκόπηση για 1 αρχείο
  - Λήψη
  - Μετακίνηση
  - Διαγραφή
- Αν υπάρχουν folders:
  - Μετακίνηση
  - Διαγραφή
- Αν η επιλογή είναι μικτή:
  - Μετακίνηση
  - Διαγραφή
  - Λήψη μόνο για τα αρχεία της επιλογής

### 3) Context menu για πολλά επιλεγμένα

Αν κάνεις δεξί click πάνω σε ένα ήδη selected item, το menu θα δείχνει ενέργειες για όλα τα επιλεγμένα:

```text
8 επιλεγμένα
Μετακίνηση σε…
Λήψη αρχείων
Διαγραφή επιλεγμένων
```

Αν κάνεις δεξί click σε item που δεν είναι selected, θα συμπεριφέρεται όπως σήμερα: επιλέγει αυτό το item και δείχνει τις ενέργειές του.

### 4) Drag & drop πολλών items

Αν έχεις επιλέξει 5 αρχεία/φακέλους και σύρεις ένα από αυτά σε άλλο φάκελο, θα μετακινηθούν και τα 5.

Θα υπάρχει προστασία ώστε:

- να μην μετακινείται φάκελος μέσα στον εαυτό του
- να μην μετακινείται φάκελος μέσα σε descendant του, αν μπορούμε να το εντοπίσουμε client-side από το `folders`
- να αγνοούνται virtual folders (`vp-*`, `vc-*`, `vd-*`) όπως ήδη γίνεται

## Τεχνική υλοποίηση

### 1) Νέο selection model στο `FinderColumnView.tsx`

Θα αντικαταστήσουμε το μονό `selectedItem` ως μοναδική πηγή επιλογής με νέο state:

```ts
type SelectionKey = `file:${string}` | `folder:${string}`;

interface SelectionState {
  keys: Set<SelectionKey>;
  anchor: {
    key: SelectionKey;
    columnIndex: number;
  } | null;
}
```

Το υπάρχον `selectedItem` θα παραμείνει ως **active item** για preview/sidebar/Space preview, αλλά το multi-selection θα κρατιέται ξεχωριστά.

### 2) Helper functions

Θα προστεθούν pure helpers μέσα στο `FinderColumnView.tsx` ή σε μικρό utility αν μεγαλώσει πολύ:

- `getItemKey(item)`
- `isItemSelected(item)`
- `getColumnItemKeys(columnIndex)`
- `resolveSelectedFiles()`
- `resolveSelectedFolders()`
- `selectRange(anchor, clicked, columnIndex)`
- `clearSelection()`

Το Shift range θα δουλεύει μέσα στην ίδια στήλη, σύμφωνα με τη συνηθισμένη συμπεριφορά Finder/list views.

### 3) Click behavior

Στο row click:

- `event.shiftKey`:
  - αν υπάρχει anchor στην ίδια στήλη, επιλέγει όλα τα items ανάμεσα στο anchor και το clicked item
  - αν δεν υπάρχει anchor, επιλέγει μόνο το clicked item και το κάνει anchor
- `event.metaKey || event.ctrlKey`:
  - toggle του clicked item χωρίς να χάνεται η υπόλοιπη επιλογή
- απλό click:
  - καθαρίζει την προηγούμενη επιλογή και επιλέγει μόνο το clicked item

Για folders, το απλό click θα συνεχίσει να ανοίγει την επόμενη στήλη. Με Cmd/Ctrl ή Shift δεν θα αλλάζει απαραίτητα το path, ώστε να μπορείς να διαλέγεις πολλά folders χωρίς να “φεύγεις” συνέχεια σε άλλο επίπεδο.

### 4) Bulk operations API από `CentralFileExplorer`

Σήμερα υπάρχουν:

- `handleMoveFile(fileId, folderId)`
- `handleMoveFolder(folderId, targetParentId)`
- `handleDeleteFile(file)`
- `handleDeleteFolder(folderId)`

Θα τα επαναχρησιμοποιήσουμε και θα περάσουμε στο `FinderColumnView` bulk handlers:

```ts
onMoveFiles?: (fileIds: string[], folderId: string | null) => Promise<void>;
onMoveFolders?: (folderIds: string[], targetParentId: string | null) => Promise<void>;
onDeleteFiles?: (files: FileAttachment[]) => Promise<void>;
onDeleteFolders?: (folderIds: string[]) => Promise<void>;
```

Ή, για να κρατηθεί μικρότερο το API, θα υλοποιηθούν bulk wrappers μέσα στο `FinderColumnView` που καλούν σειριακά τα υπάρχοντα single handlers. Η προτεινόμενη λύση είναι να μπουν bulk wrappers στο `CentralFileExplorer` για καλύτερα toast messages και λιγότερα refreshes.

### 5) Μαζική μετακίνηση

Στο `CentralFileExplorer.tsx` θα προστεθούν:

- `handleMoveFiles(fileIds, folderId)`
- `handleMoveFolders(folderIds, targetParentId)`

Για αρχεία, θα γίνεται ένα `.update(...)` με `.in('id', fileIds)` όπου είναι ασφαλές, αντί για πολλά sequential updates.

Για folders, επειδή κάθε folder μπορεί να χρειάζεται validation και δεν πρέπει να μετακινηθεί σε invalid target, θα γίνει loop με checks και μετά refresh.

Μετά τη μετακίνηση:

- ενημέρωση local state
- `toast.success("Μετακινήθηκαν X αντικείμενα")`
- καθαρισμός selection

### 6) Μαζική διαγραφή

Θα προστεθεί confirmation dialog πριν τη διαγραφή:

```text
Διαγραφή 8 αντικειμένων;
Αυτό θα διαγράψει 5 αρχεία και 3 φακέλους. Τα αρχεία μέσα στους φακέλους θα μεταφερθούν στον γονικό φάκελο όπως γίνεται σήμερα.
```

Συμπεριφορά:

- Αρχεία: remove από storage + delete rows
- Φάκελοι: reuse της τωρινής λογικής `handleDeleteFolder`, που μεταφέρει τα αρχεία στον parent πριν διαγράψει τον φάκελο
- Στο τέλος ένα συνολικό toast, όχι ένα toast ανά item

### 7) Μαζική λήψη αρχείων

Για πολλά selected αρχεία θα υλοποιηθεί πρακτικά:

- για 1 αρχείο: ίδια συμπεριφορά με σήμερα
- για πολλά αρχεία: δημιουργία signed URLs και άνοιγμα/λήψη sequential με μικρό delay ή fallback σε toast αν ο browser μπλοκάρει πολλαπλά popups

Δεν θα φτιάξουμε zip αρχείο σε αυτή τη φάση, γιατί αυτό θέλει backend packaging ή client-side zip dependency και μπορεί να γίνει ξεχωριστά σωστά.

### 8) Keyboard shortcuts

Στο focused explorer container:

- `Escape`: clear selection
- `Space`: preview μόνο όταν υπάρχει ακριβώς 1 selected file
- `Delete` / `Backspace`: αν `canManage`, ανοίγει confirmation για διαγραφή selected items
- `Cmd/Ctrl + A`: επιλέγει όλα τα items της τρέχουσας στήλης

Θα αποφεύγεται η ενεργοποίηση shortcuts όταν ο χρήστης γράφει σε input/rename/create field.

## Αρχεία που θα αλλάξουν

- `src/components/files/FinderColumnView.tsx`
  - νέο multi-selection state
  - shift/cmd/ctrl click handling
  - bulk toolbar
  - bulk context menu
  - multi-drag payload
  - keyboard shortcuts
  - confirmation dialog

- `src/components/files/CentralFileExplorer.tsx`
  - bulk move/delete handlers
  - πιο καθαρά toast messages
  - πιθανή χρήση `.in(...)` για μαζική ενημέρωση αρχείων

Πιθανώς:
- `src/components/files/FilesTableView.tsx`
  - όχι απαραίτητο για το Finder view, αλλά μπορούμε να εναρμονίσουμε αργότερα τη table view selection με Shift/Cmd αν ζητηθεί.

## Τι δεν θα αλλάξει

- Δεν αλλάζει το database schema.
- Δεν αλλάζουν RLS policies.
- Δεν αλλάζει το Import Wizard.
- Δεν αφαιρείται η υπάρχουσα single-item συμπεριφορά.
- Δεν θα προστεθεί zip download σε αυτή τη φάση.

## Verification

1. Στο `/files`, επιλογή συνεχόμενων items με Shift μέσα στην ίδια στήλη.
2. Επιλογή μη συνεχόμενων items με Cmd/Ctrl.
3. Απλό click μετά από multi-selection καθαρίζει και κρατά μόνο το clicked item.
4. Cmd/Ctrl + A επιλέγει όλα τα items της τρέχουσας στήλης.
5. Drag selected files/folders σε άλλο folder → μετακινούνται όλα.
6. Bulk delete με confirmation → διαγράφει σωστά και κάνει refresh.
7. Space ανοίγει preview μόνο όταν έχει επιλεγεί ένα αρχείο.
8. Escape καθαρίζει την επιλογή.
9. Έλεγχος σε macOS-style και Windows-style modifiers: Cmd για Mac, Ctrl για Windows/Linux.
