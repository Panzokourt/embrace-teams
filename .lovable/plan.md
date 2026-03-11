

# Αναβάθμιση Διαδικασίας Έργων & AI Ανάλυσης

## Τρέχουσα κατάσταση
- Η δημιουργία έργου γίνεται σε dialog με tabs (Στοιχεία/Αρχεία/AI) χωρίς διάκριση internal vs client project
- Δεν υπάρχει `parent_project_id` στη βάση (υπό-έργα δεν υποστηρίζονται)
- Η AI ανάλυση χρησιμοποιεί ήδη Gemini Flash μέσω `analyze-document` edge function με tool calling — καλή βάση
- Ο edge function δέχεται `textContent` — η εξαγωγή κειμένου γίνεται client-side μέσω `useDocumentParser`
- Agency Fee εμφανίζεται στο creation dialog και στο detail page

## Αλλαγές

### 1. Database: `parent_project_id` + `is_internal`
Νέα migration:
- `ALTER TABLE projects ADD COLUMN parent_project_id UUID REFERENCES projects(id) ON DELETE SET NULL`
- `ALTER TABLE projects ADD COLUMN is_internal BOOLEAN NOT NULL DEFAULT false`
- Index στο `parent_project_id`
- RLS πολιτικές ακολουθούν τις υπάρχουσες

### 2. Project Creation Dialog → 2-step wizard
**Βήμα 1 — Δημιουργία** (αντικατάσταση του τρέχοντος dialog):
- **Πρώτη επιλογή**: Internal / Client project (toggle ή radio)
  - Internal: κρύβει Πελάτη, Agency Fee
  - Client: εμφανίζει Πελάτη (υποχρεωτικό)
- Πεδία: Όνομα*, Περιγραφή, Πελάτης (αν client), Κατάσταση, Budget, Ημ. Έναρξης/Λήξης, Γονικό Έργο (dropdown με projects ίδιου πελάτη), Template, Ομάδα Έργου
- **Agency Fee αφαιρείται** από εδώ (παραμένει στο detail/financials)
- **File upload zone** στο ίδιο βήμα (drag & drop + picker)
- Κουμπί "Δημιουργία" → δημιουργεί project στη βάση, ανεβάζει αρχεία

**Βήμα 2 — AI Ανάλυση** (προαιρετικό, μετά τη δημιουργία):
- Πεδίο "Οδηγίες AI" (textarea): ο χρήστης δίνει context/εντολές
- Κουμπί "Εκκίνηση Ανάλυσης"
- Εμφάνιση αποτελεσμάτων σε editable κατηγορίες (Γενικά, Οικονομικά, Ημερομηνίες, Παραδοτέα, Tasks, Μέρη)
- Κουμπί "Επανάλυση" για re-run
- Κουμπί "Εφαρμογή & Αποθήκευση" → εφαρμόζει επιλεγμένα στο project

### 3. Wizard ανοίγει και σε υπάρχον έργο
- Κουμπί "AI Ανάλυση Αρχείων" στο ProjectDetail header ή στο Files tab
- Ανοίγει τον ίδιο wizard στο Βήμα 2 (upload + analysis)
- Pre-populates τα πεδία με τα τρέχοντα δεδομένα του έργου ώστε ο χρήστης να βλέπει τι θα αλλάξει

### 4. Βελτίωση AI ανάλυσης
- **Μοντέλο**: Αλλαγή σε `google/gemini-2.5-pro` (ισχυρότερο για μεγάλα έγγραφα, πολύγλωσσο, complex reasoning) — τώρα χρησιμοποιεί `gemini-3-flash-preview`
- **Context enrichment**: Στέλνει στο edge function τα υπάρχοντα project data (name, description, client) + τις οδηγίες του χρήστη ως μέρος του prompt
- **Αυξημένο όριο**: Τώρα truncates στα 400KB — θα αυξηθεί σε 800KB (Gemini Pro υποστηρίζει μεγαλύτερο context)
- **Fallback**: Αν αποτύχει Pro, retry με Flash

### 5. Overview tab — πρόσθετες κάρτες
Στο ProjectDetail Overview, εκτός από Project Info και Team, προσθήκη:
- **Contracts card** (ήδη υπάρχει — κρατάμε)
- **Proposals/Offers card**: εμφάνιση αρχείων τύπου `proposal` (query `file_attachments` where `document_type = 'proposal'`)
- **Briefs card**: ομοίως
- **Sub-projects card**: αν `parent_project_id` δείχνει σε αυτό, εμφανίζει λίστα

### 6. Αφαίρεση Agency Fee από creation form
- Αφαιρείται μόνο από το creation dialog
- Παραμένει editable στο ProjectDetail overview & Financials tab

## Αρχεία

| Αρχείο | Αλλαγή |
|--------|--------|
| **Migration** | `parent_project_id`, `is_internal` columns |
| `src/pages/Projects.tsx` | Redesign creation dialog: internal/client toggle, parent project selector, file upload, 2-step flow, remove agency fee |
| `src/pages/ProjectDetail.tsx` | Κουμπί AI Analysis, sub-projects card, proposals/briefs cards, conditionally hide fields for internal |
| `supabase/functions/analyze-document/index.ts` | Model → `gemini-2.5-pro`, accept `projectContext` + `userInstructions`, increase truncation limit |
| `src/components/files/FileUploadWizard.tsx` | Accept `userInstructions`, pass to analysis, add re-analyze button |
| `src/components/projects/ProjectContractsCard.tsx` | Μικρές βελτιώσεις |

