

## Τι θα φτιάξουμε

Νέο **Import Wizard** στη σελίδα Files που χειρίζεται μαζική εισαγωγή (από ένα αρχείο μέχρι ολόκληρο φάκελο με υποφακέλους), προτείνει έξυπνη συσχέτιση με υπάρχοντα έργα/πελάτες/φακέλους και δημιουργεί νέα entities επί τόπου όπου χρειάζεται.

## UX flow (4 βήματα)

```text
[1 Επιλογή]  →  [2 Προορισμός]  →  [3 Αντιστοίχιση]  →  [4 Επιβεβαίωση]
 Files/Folder    Έργο / Πελάτης    AI suggestions      Preview & Import
                  / Εταιρία         per top-folder
```

### Βήμα 1 — Επιλογή πηγής
- Drop zone + δύο κουμπιά: **"Επιλογή αρχείων"** και **"Επιλογή φακέλου"** (`webkitdirectory`).
- Υποστήριξη drag-and-drop με `readDroppedItems` (υπάρχει ήδη στο `dropFolderReader.ts`) ώστε να δουλεύουν φάκελοι με υποφακέλους.
- Live preview tree των επιλεγμένων αρχείων (πρώτα 50 + counter "και άλλα N").

### Βήμα 2 — Πού ανήκει
Τρεις επιλογές με κάρτες (όπως στο `DestinationPickerDialog`):
- **Σε Έργο** → dropdown έργων + κουμπί **"+ Νέο έργο"** που ανοίγει inline form (όνομα + προαιρετικός πελάτης). Αν επιλεγεί νέος πελάτης που δεν υπάρχει, προστίθεται κι αυτός inline.
- **Σε Πελάτη** (χωρίς συγκεκριμένο έργο) → dropdown πελατών + **"+ Νέος πελάτης"**. Τα αρχεία πάνε σε auto-created project "{ClientName} – Γενικά" ή σε client-scoped folder ανάλογα με την επιλογή checkbox "Δημιούργησε project για αυτόν τον πελάτη".
- **Στην Εταιρία** → dropdown company root folders (HR, Templates, κλπ.).

Τα νέα clients/projects δημιουργούνται μόλις ο χρήστης προχωρήσει στο επόμενο βήμα (όχι στο τέλος), ώστε να φαίνονται στο tree της αντιστοίχισης.

### Βήμα 3 — Αντιστοίχιση φακέλων (heart of the wizard)
Εμφανίζεται **μόνο** αν η πηγή περιέχει υποφακέλους. Δείχνει πίνακα:

| Φάκελος πηγής | Προτεινόμενος προορισμός | Ενέργεια |
|---|---|---|
| `Συμβόλαια/` | 📁 Συμβόλαια & Συμβάσεις (existing) | [Match ▾] [Νέος] |
| `Briefs 2024/` | 📁 Briefs (existing, fuzzy 87%) | [Match ▾] [Νέος] |
| `Random/` | — δεν βρέθηκε | [Match ▾] [Νέος] |

**Λογική προτάσεων** (client-side, χωρίς AI call):
- Normalize ονομάτων (lowercase, αφαίρεση διακριτικών, trim αριθμών/ετών).
- Έλεγχος έναντι (a) `DOCTYPE_FOLDER_MAP` ονομάτων (Συμβόλαια, Briefs, Προτάσεις, κλπ.), (b) folders από `project_folder_templates` του company, (c) υπάρχοντες φάκελοι του επιλεγμένου project/company.
- Scoring: exact match → 100, contains → 70, Levenshtein-based fuzzy → 50-90. Threshold 60 για να εμφανιστεί ως "auto-suggest".
- Default action: αν score ≥ 80 → "Match σε υπάρχον"· αλλιώς → "Δημιουργία νέου φακέλου με το ίδιο όνομα".
- Ο χρήστης μπορεί να αλλάξει κάθε γραμμή χειροκίνητα.

Επιπλέον: checkbox **"Διατήρηση δομής υποφακέλων"** (default ON) — αν OFF, όλα τα αρχεία πέφτουν επίπεδα στον προορισμό κάθε top-folder.

### Βήμα 4 — Επιβεβαίωση & Import
- Summary: "X αρχεία, Y φάκελοι → προορισμός Z".
- Progress bar ανά αρχείο κατά την εκτέλεση.
- Reuse της υπάρχουσας `handleUploadFolder` λογικής αλλά με pre-resolved mapping (skip του destination picker και των auto-created folders όπου ταιριάζει).
- Στο τέλος toast + redirect στον προορισμό μέσα στο Finder column view.

## Είσοδος στο wizard

Νέο κουμπί **"Εισαγωγή"** (icon `Import` / `FolderInput`) στο toolbar του `CentralFileExplorer`, δίπλα στο type filter. Ανοίγει το wizard χωρίς preselection.

Επίσης, αν ο χρήστης κάνει drag-and-drop **πάνω από 1 φάκελο ή >10 αρχεία** στο root level, ρωτάμε αν θέλει να ανοίξει το wizard αντί του απλού upload.

## Τεχνικές σημειώσεις

**Νέα αρχεία:**
- `src/components/files/import-wizard/ImportWizard.tsx` — το main dialog (4 steps, state machine).
- `src/components/files/import-wizard/StepSource.tsx` — file/folder picker + drop + tree preview.
- `src/components/files/import-wizard/StepDestination.tsx` — έργο/πελάτης/εταιρία + inline create.
- `src/components/files/import-wizard/StepMapping.tsx` — πίνακας αντιστοίχισης folders.
- `src/components/files/import-wizard/StepConfirm.tsx` — summary + progress.
- `src/components/files/import-wizard/folderMatcher.ts` — pure utility: `suggestFolderMatch(srcName, candidates)` με normalization + Levenshtein.
- `src/components/files/import-wizard/types.ts` — shared types (`SourceFile`, `FolderMapping`, `ImportPlan`).

**Αρχεία που αλλάζουν:**
- `src/components/files/CentralFileExplorer.tsx` — προσθήκη κουμπιού "Εισαγωγή" στο toolbar + handler που εκτελεί το import plan (επανάχρηση `handleUploadFolder` logic ή refactor σε helper που δέχεται pre-built `folderMap`).
- `src/utils/dropFolderReader.ts` — ήδη χρησιμοποιείται, καμία αλλαγή.

**Reuse:**
- `DestinationPickerDialog` λογική για το Step 2 (όχι το ίδιο component, μόνο το pattern).
- `DOCTYPE_FOLDER_MAP` από `FileUploadWizard.tsx` ως πηγή προτεινόμενων ονομάτων.
- `ensure_company_root_folders` RPC — ήδη τρέχει στο mount.
- `project_folder_templates` table — fetched once για να μπει στις υποψήφιες αντιστοιχίσεις.

**Inline create endpoints:**
- Νέος πελάτης: `INSERT INTO clients { name, company_id }` με τα standard fields. Αν χρειάζεται περισσότερα required fields, ανοίγει inline mini-form.
- Νέο έργο: `INSERT INTO projects { name, client_id, company_id, created_by, status: 'active' }`. Trigger υπάρχει ήδη που δημιουργεί τους template folders αυτόματα — άρα μετά το insert ξανα-fetch-άρουμε folders και τα νέα default folders εμφανίζονται στο Step 3 ως candidates.

**Performance:**
- Για >100 αρχεία: chunked upload (10 παράλληλα) με `Promise.all` σε batches.
- Progress callback μέσω state setter ανά batch.

**Validation guards:**
- Εμπόδιο submit αν δεν έχουν επιλεγεί αρχεία.
- Εμπόδιο αν "Σε Έργο" χωρίς project selection.
- Confirmation αν >50 αρχεία ή >10 νέοι φάκελοι.

## Εκτός scope (για επόμενο iteration)
- AI-powered semantic suggestions (π.χ. "αυτό μοιάζει με τιμολόγιο του Alpha Bank") — μόνο rule-based fuzzy matching τώρα.
- Conflict resolution για διπλά ονόματα αρχείων (overwrite/rename/skip prompt). Default: keep both (storage key έχει timestamp ήδη).
- Background/resume για πολύ μεγάλα imports.

