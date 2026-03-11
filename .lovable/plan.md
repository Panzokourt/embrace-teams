

# Σύστημα Εγγράφων & AI Ανάλυσης σε Έργα

## Τι θα υλοποιηθεί

### 1. Αυτόματη δομή φακέλων κατά τη δημιουργία έργου
Κατά τη δημιουργία νέου project, θα δημιουργούνται αυτόματα οι παρακάτω φάκελοι στο `file_folders`:

```text
📁 Προτάσεις (Proposals)
📁 Παρουσιάσεις (Presentations)
📁 Προσφορές (Quotations)
📁 Συμβόλαια & Συμβάσεις (Contracts)
📁 Briefs
📁 Αναφορές (Reports)
📁 Δημιουργικά (Creatives)
📁 Τιμολόγια & Παραστατικά (Invoices)
📁 Προμηθευτές (Vendors)
📁 Αλληλογραφία (Correspondence)
```

Trigger function στη βάση (`auto_create_project_folders`) που εκτελείται μετά το INSERT στον πίνακα `projects`.

### 2. Παραμετροποιήσιμη δομή φακέλων ανά οργανισμό
- Νέος πίνακας `project_folder_templates` (company_id, name, sort_order, is_default)
- Αν ο οργανισμός έχει custom template, χρησιμοποιείται αυτό — αλλιώς fallback στα defaults
- Ενότητα στις Ρυθμίσεις για διαχείριση (add/remove/reorder folder categories)

### 3. Τύπος εγγράφου (Document Type) στο upload
- Νέα στήλη `document_type` στο `file_attachments` (enum: contract, brief, proposal, report, invoice, presentation, creative, vendor_doc, correspondence, other)
- Κατά το upload εμφανίζεται dropdown για επιλογή τύπου
- Αυτόματη τοποθέτηση στον αντίστοιχο φάκελο βάσει τύπου

### 4. AI Ανάλυση εγγράφου κατά το upload
- Νέα στήλη `ai_analysis` (JSONB) στο `file_attachments` για αποθήκευση αποτελεσμάτων
- Νέο edge function `analyze-document` — εξειδικευμένο ανά document_type:
  - **Σύμβαση/Συμβόλαιο**: εξαγωγή μερών, ημερομηνιών, ποσών, όρων, υποχρεώσεων
  - **Brief**: στόχοι, target audience, KPIs, budget, timeline
  - **Προσφορά**: αναλυτικό κόστος, υπηρεσίες, παραδοτέα
  - **Γενικό**: περίληψη, key entities, ημερομηνίες, ποσά
- Τα extracted data εμφανίζονται σε panel δίπλα στο αρχείο, editable
- Δυνατότητα "Εφαρμογή" στο project (ενημέρωση budget, dates, description)

### 5. Σύνδεση Συμβολαίων με Έργο
- Νέος πίνακας `project_contracts` (project_id, file_attachment_id, contract_type, parties, start_date, end_date, value, status, extracted_data JSONB)
- Στο Overview tab του project: νέα κάρτα "Συμβόλαια" που δείχνει τα linked contracts
- Αυτόματη δημιουργία record όταν ανεβαίνει αρχείο τύπου "contract"

## Database Migration

```sql
-- Document type enum
CREATE TYPE public.document_type AS ENUM (
  'contract','brief','proposal','report','invoice',
  'presentation','creative','vendor_doc','correspondence','other'
);

-- Add columns to file_attachments
ALTER TABLE public.file_attachments
  ADD COLUMN document_type public.document_type DEFAULT 'other',
  ADD COLUMN ai_analysis jsonb;

-- Project folder templates (customizable per org)
CREATE TABLE public.project_folder_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  document_type public.document_type,
  sort_order integer DEFAULT 0,
  is_default boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Project contracts
CREATE TABLE public.project_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_attachment_id uuid REFERENCES file_attachments(id) ON DELETE SET NULL,
  contract_type text,
  parties jsonb DEFAULT '[]',
  start_date date,
  end_date date,
  value numeric,
  status text DEFAULT 'active',
  extracted_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-create folders trigger
CREATE OR REPLACE FUNCTION public.auto_create_project_folders()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _templates RECORD;
  _has_custom boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM project_folder_templates WHERE company_id = NEW.company_id
  ) INTO _has_custom;

  IF _has_custom THEN
    FOR _templates IN
      SELECT name FROM project_folder_templates
      WHERE company_id = NEW.company_id ORDER BY sort_order
    LOOP
      INSERT INTO file_folders (project_id, name, created_by)
      VALUES (NEW.id, _templates.name, NEW.created_by);
    END LOOP;
  ELSE
    -- Default folders
    INSERT INTO file_folders (project_id, name, created_by) VALUES
      (NEW.id, 'Προτάσεις', NEW.created_by),
      (NEW.id, 'Παρουσιάσεις', NEW.created_by),
      (NEW.id, 'Προσφορές', NEW.created_by),
      (NEW.id, 'Συμβόλαια & Συμβάσεις', NEW.created_by),
      (NEW.id, 'Briefs', NEW.created_by),
      (NEW.id, 'Αναφορές', NEW.created_by),
      (NEW.id, 'Δημιουργικά', NEW.created_by),
      (NEW.id, 'Τιμολόγια & Παραστατικά', NEW.created_by),
      (NEW.id, 'Προμηθευτές', NEW.created_by),
      (NEW.id, 'Αλληλογραφία', NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_project_folders
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION auto_create_project_folders();
```

## Edge Function — `analyze-document`
Δέχεται file content + document_type, χρησιμοποιεί Lovable AI (Gemini) με εξειδικευμένο prompt ανά τύπο. Επιστρέφει structured JSON με extracted fields (μέρη, ημερομηνίες, ποσά, όροι, περίληψη). Tool calling για structured output.

## Αρχεία

| Αρχείο | Αλλαγή |
|--------|--------|
| Migration SQL | Enum, στήλες, πίνακες, trigger |
| `supabase/functions/analyze-document/index.ts` | Νέο edge function για AI analysis ανά τύπο εγγράφου |
| `src/components/files/FileExplorer.tsx` | Document type selector στο upload, AI analysis trigger |
| `src/components/files/DocumentAnalysisPanel.tsx` | Νέο — panel εμφάνισης & επεξεργασίας AI extracted data |
| `src/components/files/FileUploadDialog.tsx` | Νέο — dialog upload με επιλογή τύπου εγγράφου |
| `src/components/projects/ProjectContractsCard.tsx` | Νέο — κάρτα συμβολαίων στο Overview tab |
| `src/pages/ProjectDetail.tsx` | Ενσωμάτωση ProjectContractsCard στο Overview |
| `src/settings/ProjectFolderTemplatesManager.tsx` | Νέο — UI για παραμετροποίηση folder structure |
| `src/pages/Settings.tsx` | Νέα ενότητα "Δομή Φακέλων Έργων" |

