

## Τι θα διορθώσουμε

Δύο ξεχωριστά προβλήματα στο Import Wizard:

### A. UI σταθερότητα & υπερβολικό πλάτος

**Αιτία**: 
- Το `DialogContent` έχει μόνο `sm:max-w-2xl` (max-width) χωρίς σταθερό πλάτος, οπότε το παράθυρο "αναπνέει" όταν αλλάζει το περιεχόμενο.
- Στις λίστες αρχείων (StepSource & StepConfirm) τα `<span className="truncate">` βρίσκονται μέσα σε flex parent **χωρίς `min-w-0`**, άρα το `truncate` αγνοείται και τα μεγάλα paths σπρώχνουν το container πιο πλατύ → οριζόντιο scroll.

**Λύση**:
1. **Σταθερό πλάτος dialog**: αλλαγή σε `w-[min(640px,calc(100vw-2rem))] max-w-none` στο `DialogContent` → ίδιο πλάτος σε όλα τα βήματα, responsive σε μικρές οθόνες.
2. **Σταθερό ύψος content area**: το `<div className="min-h-[280px]">` γίνεται `min-h-[340px] max-h-[60vh] overflow-y-auto` ώστε όταν εμφανίζεται μεγάλη λίστα, scroll-άρει εσωτερικά αντί να μεγαλώνει το dialog.
3. **Σωστό truncation των paths**: 
   - StepSource list `<li>`: αλλαγή σε `flex items-center gap-2 min-w-0` στο parent + `flex-1 min-w-0 truncate` στο span. Ίδιο pattern στο StepConfirm currentFile.
   - Επιπλέον `dir="rtl"` ή χρήση custom middle-truncation για paths (κρατάμε αρχή και τέλος, π.χ. `01. ΕΑΠ (...)/.../lifo.png`) ώστε ο χρήστης να βλέπει και το όνομα του αρχείου, όχι μόνο τους πρώτους χαρακτήρες.
4. **Header/Stepper σταθερό**: το stepper bar μένει πάντα ορατό· τα steps γίνονται scroll-able εσωτερικά.

### B. Διατήρηση υποφακέλων

**Αιτία**:
1. Το βήμα Αντιστοίχισης δείχνει **μόνο τους top-level φακέλους** (στο case του χρήστη: 1 γραμμή `01. ΕΑΠ (2025-2026)`). Δεν είναι ξεκάθαρο ότι οι υπο-υπο-φάκελοι θα αναπαραχθούν αυτόματα — ο χρήστης νομίζει ότι θα χαθούν.
2. **Race condition στο `ensureSubfolder`**: τρέχει με `UPLOAD_PARALLELISM = 8` παράλληλα, και για το ίδιο nested path (π.χ. `08. PROJECT MANAGEMENT/3. Δελτία Τύπου`) μπορούν 8 uploads να καλέσουν `INSERT` ταυτόχρονα πριν γεμίσει το cache → πολλαπλά διπλά folder records ή αποτυχίες constraint, με αποτέλεσμα τα αρχεία να καταλήγουν σε λάθος/null folder.
3. Το `Φάκελοι προς δημιουργία: 1` στο Step 4 αναφέρει μόνο τους top-level — δεν δείχνει πόσοι nested θα δημιουργηθούν, οπότε ο χρήστης ανησυχεί.

**Λύση**:

1. **Pre-compute όλης της δομής υποφακέλων** ΠΡΙΝ το upload:
   - Νέα συνάρτηση `buildFolderTree(files)` που γυρίζει πλήρες tree με όλα τα μοναδικά paths (`08.PROJECT/3.Δελτία/8. Aitiseis september`).
   - Στο Step Confirm, "Φάκελοι προς δημιουργία" δείχνει **σύνολο nested folders**, όχι μόνο top-level.
   - Στο Step Mapping, κάτω από κάθε top-level row εμφανίζεται μικρό label `+N υποφάκελοι θα διατηρηθούν` (όταν preserveStructure = true), ώστε ο χρήστης να βλέπει ότι η ιεραρχία θα κρατηθεί.

2. **Pre-create folders sequentially πριν τα uploads** (διορθώνει το race):
   - Νέα φάση στο `runImport`: `await ensureAllFolders(tree, ...)` που δημιουργεί όλους τους φακέλους σειριακά (DFS), γεμίζει το `subfolderCache` με `relativePath → folderId`, και επιστρέφει το mapping.
   - Στη συνέχεια τα παράλληλα uploads απλώς διαβάζουν το έτοιμο cache (`pathToFolderId.get(parentPath)`) — καμία εγγραφή folder κατά το upload phase.
   - Το progress UI παίρνει νέα φάση: "Δημιουργία δομής φακέλων (X/Y)" πριν αρχίσει το "Ανέβασμα αρχείων".

3. **Preserve-structure ορατό στο Step 1**: το checkbox μετακινείται (αντίγραφο) και στο Step Source ως μόνιμη επιλογή με σαφές label, ώστε ο χρήστης να ξέρει εξαρχής τι θα γίνει.

4. **Tree preview στο Step Source**: αντί για flat λίστα paths, εμφάνιση συμπυκνωμένου tree (collapsed by default, expandable) με icons για folders και αρχεία. Δείχνει ξεκάθαρα ότι η δομή αναγνωρίστηκε. Παράδειγμα:

   ```text
   📁 01. ΕΑΠ (2025-2026)            186 αρχεία
     📁 01. Social Media               45
     📁 03. Δελτία Τύπου               87
     📁 08. PROJECT MANAGEMENT         54
   ```

   Toggle button "Δομή / Λίστα" για όποιον προτιμά την παλιά προβολή.

## Αρχεία που αλλάζουν

- `src/components/files/import-wizard/ImportWizard.tsx` — σταθερό πλάτος/ύψος dialog· νέα `ensureAllFolders` φάση· progress φάσεις (folders → files)· σύνολο nested στο summary.
- `src/components/files/import-wizard/StepSource.tsx` — `min-w-0` fixes, νέο tree-view component, preserve-structure checkbox, middle-truncation για paths.
- `src/components/files/import-wizard/StepConfirm.tsx` — `min-w-0` fix στο currentFile· δείχνει 2 progress bars (folders, files) όταν χρειάζεται.
- `src/components/files/import-wizard/StepMapping.tsx` — δείχνει nested folder count κάτω από κάθε mapping row.
- `src/components/files/import-wizard/types.ts` — επέκταση `ImportProgress` με `phase: 'folders' | 'files'`.

## Τι ΔΕΝ αλλάζει

- Η DB / RLS / edge functions.
- Το flow των βημάτων (4 steps).
- Η λογική fuzzy matching.

## Verification

1. Drag-drop ενός φακέλου με βαθιά ιεραρχία (όπως το `01. ΕΑΠ`) → το dialog διατηρεί σταθερό πλάτος, η λίστα εμφανίζει όλους τους φακέλους ως tree.
2. Step 4 → "Φάκελοι προς δημιουργία: 23" (πραγματικός αριθμός), 2 progress bars.
3. Άνοιγμα του Files μετά το import → όλη η ιεραρχία `01. ΕΑΠ/08. PROJECT MANAGEMENT/3. Δελτία Τύπου/8. Aitiseis september/...` υπάρχει με τα αρχεία στους σωστούς φακέλους.
4. Δοκιμή σε narrow viewport (768px) → δεν εμφανίζεται horizontal scrollbar.

