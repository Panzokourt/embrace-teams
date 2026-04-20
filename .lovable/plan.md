

## Πρόβλημα
Όταν σύρεις έναν φάκελο από το desktop στα Files, εμφανίζεται "Σφάλμα κατά το ανέβασμα". Στο console: `StorageUnknownError: Failed to fetch` στο `supabase.storage.upload`.

## Διάγνωση
Στο `FinderColumnView.tsx` (`handleDrop`):

1. Διαβάζει μόνο `e.dataTransfer.files` και ελέγχει `webkitRelativePath`.
2. Όμως όταν σύρεις **φάκελο** από το OS, το `webkitRelativePath` είναι **πάντα κενό** στο native drop — υπάρχει μόνο όταν επιλέγεις φάκελο μέσω `<input type="file" webkitdirectory>`.
3. Έτσι το flow πέφτει στο `onUpload(droppedFiles, ...)`, που προσπαθεί να ανεβάσει τον φάκελο σαν αρχείο → το Supabase storage σπάει με `Failed to fetch`.

Η σωστή λύση είναι να χρησιμοποιηθεί το **`DataTransferItem.webkitGetAsEntry()`** API που εκθέτει `FileSystemDirectoryEntry` και επιτρέπει αναδρομική ανάγνωση των περιεχομένων του φακέλου.

## Σχέδιο διόρθωσης

### 1. Νέο utility `readDroppedItems` (`src/utils/dropFolderReader.ts`)
- Δέχεται `DataTransferItemList`.
- Καλεί `webkitGetAsEntry()` σε κάθε item.
- Για `FileSystemFileEntry` → επιστρέφει `{ file, relativePath }`.
- Για `FileSystemDirectoryEntry` → αναδρομική διάσχιση με `createReader().readEntries()`, χτίζει σωστό `relativePath` (π.χ. `MyFolder/sub/file.png`).
- Επιστρέφει `Array<{ file: File; relativePath: string }>`.

### 2. Update `FinderColumnView.handleDrop`
- Πριν διαβάσει `dataTransfer.files`, ελέγχει αν `dataTransfer.items` περιέχει directory entries.
- Αν ναι → καλεί `readDroppedItems`, αν τουλάχιστον ένα entry έχει "/", περνά στο `onUploadFolder` ως pseudo-FileList με τα συλλεχθέντα files + relativePath.
- Αν όχι → fallback στο υπάρχον behavior για flat files.

### 3. Update `CentralFileExplorer.handleUploadFolder`
- Αλλαγή signature ώστε να δέχεται είτε `FileList` είτε `Array<{ file, relativePath }>`.
- Αντί για `webkitRelativePath`, χρησιμοποιεί το παρεχόμενο `relativePath` για να χτίσει την ιεραρχία φακέλων.
- Διατηρεί συμβατότητα με το input-based folder upload (που χρησιμοποιεί `webkitRelativePath`).

### 4. Verification
- Drag & drop ενός φακέλου με υποφακέλους & αρχεία στο root → δημιουργείται η ιεραρχία.
- Drag & drop πολλαπλών αρχείων → ανεβαίνουν flat.
- Drag & drop μέσα σε υπάρχοντα φάκελο (στήλη) → σωστή τοποθέτηση.
- Browser-button "Ανέβασμα φακέλου" συνεχίζει να δουλεύει κανονικά.

## Αρχεία που θα αλλάξουν
- `src/utils/dropFolderReader.ts` (**νέο**)
- `src/components/files/FinderColumnView.tsx`
- `src/components/files/CentralFileExplorer.tsx`

## Τεχνικές σημειώσεις
- Καμία αλλαγή σε DB ή storage policies.
- Το `webkitGetAsEntry` υποστηρίζεται σε όλους τους modern browsers (Chrome, Safari, Firefox, Edge).
- Το αρχικό σφάλμα είναι frontend-only — δεν χρειάζεται server αλλαγή.

