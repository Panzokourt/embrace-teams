

## Στόχος

Νέο **Bulk Import Wizard** που επιτρέπει στον χρήστη να ανεβάζει `.xlsx` ή `.csv` αρχεία και να εισάγει μαζικά **Πελάτες**, **Έργα** ή **Tasks**, με AI-assisted column mapping, validation, inline δημιουργία εξαρτήσεων (π.χ. αν λείπει πελάτης για ένα έργο), και downloadable templates.

## Πού θα εμφανίζεται

Νέο κουμπί **"Μαζική Εισαγωγή"** (icon: `Upload`) στο `PageHeader` τριών σελίδων:

- `/clients`
- `/projects`
- `/tasks`

Επίσης ένα κεντρικό entry στο sidebar `Settings → Import / Export` για όσους θέλουν να ξεκινήσουν από εκεί επιλέγοντας entity type.

## Wizard flow (5 βήματα)

```text
[1 Entity & Source] → [2 Upload] → [3 Mapping] → [4 Validation] → [5 Import]
```

### Βήμα 1 — Entity & Source

- Επιλογή τι θα εισαχθεί: **Πελάτες / Έργα / Tasks**
- Δύο επιλογές πηγής:
  - **Κατέβασε template** (`.xlsx` με προ-συμπληρωμένο header + 2 παραδείγματα + dropdown validation σε enum πεδία).
  - **Ανέβασε υπάρχον αρχείο** (`.xlsx` ή `.csv`).

### Βήμα 2 — Upload & Preview

- Drag-and-drop ή file picker.
- Ανίχνευση αρχείου με `xlsx` (SheetJS) για excel, `papaparse` για csv.
- Επιλογή sheet αν το excel έχει πολλά.
- Preview πρώτων 10 γραμμών σε πίνακα.
- Auto-detect headers (πρώτη γραμμή).

### Βήμα 3 — AI-assisted Column Mapping

- Πίνακας: αριστερά οι columns του αρχείου, δεξιά dropdown με τα πεδία του target entity.
- **Αυτόματη πρόταση mapping** με δύο επίπεδα:
  1. Local fuzzy match (π.χ. `όνομα` → `name`, `email` → `contact_email`).
  2. AI fallback μέσω **Lovable AI Gateway** (`google/gemini-2.5-flash-lite`) που δέχεται headers + 3 sample rows και επιστρέφει JSON mapping suggestion με confidence.
- Επισήμανση required πεδίων που λείπουν (κόκκινο badge).
- Δυνατότητα να αγνοηθεί column.

### Βήμα 4 — Validation & Resolution

Per-row validation με inline επεξεργασία στον πίνακα:

- **Format checks**: email, ημερομηνίες (ISO ή `dd/mm/yyyy`), αριθμοί, enums.
- **Foreign key resolution**:
  - Projects → matching `client_id` με `client_name` column. Αν δεν βρεθεί:
    - πρόταση "Δημιουργία νέου πελάτη" (one-click ανά row ή bulk για όλα τα missing).
  - Tasks → matching `project_id` με `project_name`, `assigned_to` με email/full_name. Ομοίως one-click create για projects, ή skip για users (προτείνεται unassigned).
- **Duplicate detection** (case-insensitive) μέσα στο file αλλά και έναντι DB (warning, όχι block).
- Color-coded summary: ✅ Έγκυρα / ⚠️ Με warnings / ❌ Σφάλματα.
- Ο χρήστης μπορεί να επεξεργαστεί κάθε cell inline πριν προχωρήσει.

### Βήμα 5 — Import & Report

- Progress bar (batched inserts ανά 50 rows).
- Δημιουργία deps πρώτα (νέοι πελάτες → νέα έργα → tasks) με σωστή σειρά εξαρτήσεων.
- Final report: πόσα δημιουργήθηκαν, πόσα παραλείφθηκαν, πόσα απέτυχαν, με downloadable error log (`.csv`).
- Buttons: "Δες τα νέα δεδομένα" → πλοηγεί στη λίστα φιλτραρισμένη στα νεοεισαχθέντα.

## Templates

Auto-generated `.xlsx` ανά entity με:

- **Clients template**: `name*, sector, website, contact_email, contact_phone, address, tax_id, tags, status, notes`
- **Projects template**: `name*, client_name, status, start_date, end_date, budget, commission_rate, description, category`
- **Tasks template**: `title*, project_name, assigned_to_email, status, priority, due_date, estimated_hours, description`

(Αστερίσκος = υποχρεωτικό.)

Δεύτερο sheet "Οδηγίες" με enum values και format examples.

## Τεχνική προσέγγιση

### Νέα dependencies

- `xlsx` (SheetJS) για read/write `.xlsx`.
- `papaparse` για csv parsing.

### Νέα αρχεία

```text
src/components/import/
  ImportWizard.tsx                  # Κύριο dialog/stepper
  steps/
    StepEntitySource.tsx
    StepUpload.tsx
    StepMapping.tsx
    StepValidation.tsx
    StepImport.tsx
  schemas/
    clientSchema.ts                 # field defs + validators
    projectSchema.ts
    taskSchema.ts
  utils/
    parseFile.ts                    # xlsx + csv → rows
    fuzzyMatch.ts                   # header → field
    validators.ts
    templateBuilder.ts              # κατασκευή downloadable template
    importExecutor.ts               # batched inserts με dep resolution
src/hooks/
  useImportWizard.ts                # state machine
```

### Νέο edge function

```text
supabase/functions/ai-suggest-mapping/index.ts
```

Δέχεται `{entity, headers, sampleRows}`, καλεί Lovable AI Gateway με JSON tool-call, επιστρέφει `{mapping: {col: field}, confidence}`.

### Τροποποιήσεις

- `src/pages/Clients.tsx`, `src/pages/Projects.tsx`, `src/pages/Tasks.tsx`:
  - Νέο κουμπί "Μαζική Εισαγωγή" στο `PageHeader.actions`.
  - Mount του `<ImportWizard entity="..." onComplete={refresh} />`.
- `src/pages/Settings.tsx` (ή `OrganizationSettings`): νέα entry "Import / Export" που ανοίγει το wizard με entity picker.

### Ασφάλεια & multi-tenant

- Όλα τα inserts περιλαμβάνουν `company_id` από `useAuth().company.id`.
- Ο χρήστης πρέπει να έχει role `owner/admin/manager` (έλεγχος μέσω `is_admin_or_manager`).
- Tasks: `created_by` = current user, `assigned_to` resolution ψάχνει μόνο σε users του same company.

## Τι ΔΕΝ αλλάζει

- DB schema (κανένα νέο table).
- RLS policies.
- Storage buckets.
- Δεν διαγράφεται/ενημερώνεται κανένα υπάρχον record (μόνο insert mode σε αυτή τη φάση).

## Verification

1. `/clients` → "Μαζική Εισαγωγή" → download template → άνοιγμα στο Excel: σωστά headers + dropdown validation.
2. Upload csv με 50 πελάτες → preview, mapping auto-suggest, validation καθαρό → import → εμφανίζονται όλοι στη λίστα.
3. `/projects` → upload xlsx με στήλη `client_name` που δεν υπάρχει → wizard προτείνει "Δημιουργία πελάτη" → bulk-create → import περνά.
4. `/tasks` → upload με `assigned_to_email` που δεν αντιστοιχεί σε χρήστη → row περνά ως unassigned με warning.
5. Σκόπιμα λάθη (κενό όνομα, λάθος email) → block με κόκκινο highlight & inline edit.
6. Άκυρο file format → καθαρό error message.
7. Final report → download `.csv` με failed rows + λόγο.
8. Ο χρήστης χωρίς admin/manager role δεν βλέπει το κουμπί.

