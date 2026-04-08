

# Files Page — Αφαίρεση "Όλα" tab, Drag & Drop μετακίνηση, Upload φακέλων

## Τι αλλάζει

### 1. Αφαίρεση tab "Όλα"
- Αφαίρεση του `'all'` από τα `VIEW_TABS` και `FileViewMode`
- Default view γίνεται `'by-project'`
- Η λογική `viewMode === 'all'` αντικαθίσταται — στο "Κατά Έργο" εμφανίζονται τα πραγματικά subfolders κάτω από κάθε project, οπότε δεν υπάρχει σύγχυση με διπλά ονόματα

### 2. Context menu "Μετακίνηση σε..." για αρχεία
- Στο δεξί κλικ αρχείου, προσθήκη submenu **"Μετακίνηση σε..."** που δείχνει λίστα φακέλων
- Ο χρήστης επιλέγει φάκελο-στόχο και το αρχείο μετακινείται
- Ίδιο context menu και για φακέλους (μετακίνηση φακέλου σε άλλο parent)

### 3. Drag & Drop αρχείων σε φακέλους
- Ήδη υπάρχει βασικό internal DnD — θα ενισχυθεί ώστε:
  - Τα αρχεία να σύρονται σε φακέλους σε οποιαδήποτε στήλη (ήδη λειτουργεί εν μέρει)
  - Να λειτουργεί και στα grouped views (by-project, by-client) — αυτό σημαίνει ότι στα virtual views θα περνάμε τα `onMoveFile`/`onMoveFolder` handlers αντί undefined, αλλά μόνο για μετακινήσεις εντός πραγματικών φακέλων

### 4. Upload ολόκληρου φακέλου
- Προσθήκη `webkitdirectory` attribute στο hidden file input (νέο δεύτερο input)
- Νέο κουμπί "Ανέβασμα φακέλου" στο toolbar και στο context menu
- Κατά το upload φακέλου:
  - Διάβασε τα `webkitRelativePath` από κάθε αρχείο
  - Δημιούργησε αυτόματα τη δομή φακέλων (file_folders) βάσει των paths
  - Upload κάθε αρχείο στον αντίστοιχο φάκελο
- Στο OS drag & drop: αν τα dropped files έχουν `webkitRelativePath`, δημιουργεί αυτόματα subfolders

## Files

| File | Αλλαγή |
|------|--------|
| `src/components/files/CentralFileExplorer.tsx` | Αφαίρεση 'all' tab, default 'by-project', νέο `handleUploadFolder` method, pass `onMoveFile`/`onMoveFolder` σε όλα τα views |
| `src/components/files/FinderColumnView.tsx` | Context menu "Μετακίνηση σε..." submenu, folder upload button + hidden input, folder drop detection via `webkitRelativePath` |

