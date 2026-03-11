

# Διόρθωση Δομής Φακέλων, Drag & Drop, Κεντρικής Σελίδας & AI Ανάλυσης

## Προβλήματα που εντοπίστηκαν

### 1. Φάκελοι δεν εμφανίζονται σε υπάρχοντα έργα
Το trigger `auto_create_project_folders` τρέχει μόνο στο INSERT νέου project. Για ήδη υπάρχοντα projects (π.χ. EDYTE) δεν δημιουργήθηκαν ποτέ φάκελοι. Επίσης στη `FinderColumnView` γραμμή 115, αν δεν υπάρχουν root folders, εμφανίζονται flat τα αρχεία χωρίς δομή.

**Λύση**: Στο `FileExplorer`, μετά το fetch folders, αν `projectId` υπάρχει αλλά δεν υπάρχουν folders → φέρνει templates από `project_folder_templates` ή χρησιμοποιεί defaults → δημιουργεί τους φακέλους → re-fetch. Στη `FinderColumnView` αφαίρεση του special case (γρ. 115) ώστε πάντα να εμφανίζεται η δομή.

### 2. Drag & Drop
Δεν υπάρχει drag & drop στο `FinderColumnView`. Προσθήκη `onDragOver`/`onDrop` handlers σε κάθε column με visual feedback (dashed border).

### 3. Κεντρική σελίδα αρχείων — sync φακέλων ανά έργο
Στο `CentralFileExplorer` στο view "Κατά Έργο" εμφανίζονται virtual folders ανά project αλλά χωρίς τη δομή υποφακέλων. Θα φέρνει τα πραγματικά `file_folders` κάθε project.

### 4. AI Ανάλυση δεν δουλεύει
Δύο προβλήματα:
- **Edge function deployment**: Η function υπάρχει στο config.toml αλλά δεν φαίνεται deployed (no logs, "Failed to fetch" error). Χρειάζεται re-deploy.
- **DOCX αρχεία δεν αναγνωρίζονται**: Ο κώδικας στο `runDocumentAnalysis` (γρ. 229-241) χειρίζεται μόνο text/json/xml και PDF. Τα DOCX (content-type `application/vnd.openxmlformats-officedocument.wordprocessingml.document`) πέφτουν στο else branch με μήνυμα "Δεν είναι δυνατή η εξαγωγή κειμένου" — οπότε στέλνει ουσιαστικά κενό content στο AI.
- **Λύση**: Χρήση του υπάρχοντος `useDocumentParser` hook (που ήδη κάνει DOCX parsing μέσω `parse-document` edge function) για εξαγωγή κειμένου πριν σταλεί στο `analyze-document`. Αυτό καλύπτει PDF, DOCX, PPTX, κλπ.

## Αρχεία

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/components/files/FileExplorer.tsx` | Auto-sync folders + fix document text extraction μέσω `useDocumentParser` |
| `src/components/files/FinderColumnView.tsx` | Fix root display (αφαίρεση flat fallback) + drag & drop handlers |
| `src/components/files/CentralFileExplorer.tsx` | Εμφάνιση real subfolders στο "Κατά Έργο" |
| Edge function `analyze-document` | Re-deploy (ήδη σωστός ο κώδικας) |

