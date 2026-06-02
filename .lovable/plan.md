## Μαζική Εξαγωγή (Bulk Export)

Νέα ενότητα στις Ρυθμίσεις, ακριβώς κάτω από τη Μαζική Εισαγωγή, που επιτρέπει εξαγωγή πελατών / έργων / tasks σε αρχεία Excel/CSV με την ίδια δομή με τα import templates.

### UX flow

1. Ο χρήστης μπαίνει στο `/settings` → section **«Μαζική Εξαγωγή»** (group: Δεδομένα & Ενσωματώσεις, ακριβώς μετά το Import).
2. Επιλέγει με checkboxes ποιες οντότητες θέλει: Πελάτες / Έργα / Tasks.
3. **Φίλτρο πελατών (προαιρετικό)**: multi-select πελατών (searchable). Αν επιλεγούν συγκεκριμένοι πελάτες:
   - Πελάτες → μόνο οι επιλεγμένοι
   - Έργα → μόνο όσα ανήκουν στους επιλεγμένους πελάτες
   - Tasks → μόνο όσα ανήκουν σε έργα των επιλεγμένων πελατών
   - Αν δεν επιλεγεί κανείς → όλα τα δεδομένα της εταιρείας
4. Επιλογή format: **Excel (.xlsx)** ή **CSV**.
5. Κουμπί **«Λήψη»** → παράγει και κατεβάζει ξεχωριστό αρχείο για κάθε επιλεγμένη οντότητα (π.χ. αν διαλέξει πελάτες+έργα → 2 αρχεία).

### Δομή αρχείων

Τα αρχεία ακολουθούν **ακριβώς** τα ίδια headers/πεδία με τα import templates (`clientSchema`, `projectSchema`, `taskSchema`) ώστε να είναι round-trip συμβατά (export → edit → re-import). Επαναχρησιμοποιείται το `buildTemplate` pattern από `src/components/import/utils/templateBuilder.ts`, με δεύτερο sheet «Οδηγίες» όπως και στα templates.

Mapping ειδικών πεδίων:
- `client_name` (στα projects): από join με `clients.name`
- `project_name` + `assigned_to_email` (στα tasks): από joins με projects + profiles
- `tags`: array → comma-separated string
- Enums: αποθηκεύονται με το raw value (π.χ. `active`, `todo`) όπως στο import

### Τεχνικές αλλαγές

**Νέα αρχεία:**
- `src/components/settings/sections/BulkExportSection.tsx` — UI με checkboxes οντοτήτων, ClientSelector (multi), format toggle, progress state, κουμπί Export.
- `src/components/export/utils/exportBuilder.ts` — fetch από Supabase με βάση επιλεγμένα `client_ids`, μετατροπή σε rows που ταιριάζουν στα schemas, παραγωγή `.xlsx` (μέσω `xlsx`) ή `.csv`. Reuse `SCHEMAS` από `src/components/import/schemas/index.ts`.
- `src/components/export/utils/downloadAll.ts` — sequential download (μικρό delay) για >1 αρχεία.

**Edits:**
- `src/pages/Settings.tsx`: προσθήκη rail item `bulk-export` ακριβώς μετά το `bulk-import` στο ίδιο group (Δεδομένα & Ενσωματώσεις), icon `Download`, label «Μαζική Εξαγωγή».

**Queries:**
- `clients`: `SELECT name, sector, website, contact_email, contact_phone, secondary_phone, address, tax_id, tags, notes WHERE company_id = ?` (+ optional `id IN (...)`)
- `projects`: join με `clients(name)`, scoped σε `company_id` (+ optional `client_id IN (...)`)
- `tasks`: join με `projects(name, client_id)` + `profiles(email)` για assignee, scoped σε `company_id` (+ optional `project.client_id IN (...)`)

Όλα μέσω του υπάρχοντος `supabase` client, με σεβασμό στις υπάρχουσες RLS policies (company-scoped).

### Τι **δεν** αλλάζει
- Το import flow, schemas, templates, rail sidebar logic, RLS/permissions.
- Δεν προστίθενται νέοι πίνακες ή edge functions — όλα client-side με τα ίδια queries του React Query.
