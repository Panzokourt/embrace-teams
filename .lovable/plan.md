

# Onboarding Redesign — Workspace Presets, Services & Templates

## Σύνοψη

Προσθήκη 3 νέων βημάτων στο onboarding wizard: επιλογή τύπου workspace, ρύθμιση υπηρεσιών, και project templates με AI SOP generation. Απαιτεί 1 migration + 3 νέα components + ενημέρωση Onboarding.tsx.

## Βήματα υλοποίησης

### 1. Database Migration
Προσθήκη `workspace_type TEXT` και `onboarding_preset JSONB` στον πίνακα `companies`.

### 2. `src/components/onboarding/workspacePresets.ts`
Νέο αρχείο με τα 5 presets (Digital Agency, Comms/PR, Dev Team, Creative Agency, Freelancer). Κάθε preset περιέχει departments, services, projectTemplates, KPIs.

### 3. `src/components/onboarding/OnboardingWorkspacePreset.tsx`
Νέο component — ο χρήστης επιλέγει τύπο εταιρείας. Clickable cards με expanded preview (departments/services/templates pills). Αποθηκεύει `workspace_type` στον πίνακα companies.

### 4. `src/components/onboarding/OnboardingServices.tsx`
Νέο component — λίστα υπηρεσιών βάσει preset με checkboxes, inline τιμές, δυνατότητα custom service. Insert στον πίνακα `services` (mapping: `default_price` → `list_price`, `unit` → `pricing_unit`, `category` defaults to preset type).

### 5. `src/components/onboarding/OnboardingTemplates.tsx`
Νέο component — επιλογή project templates + toggle AI SOP generation. Insert σε `project_templates` (requires `project_type` = preset type) και `project_template_tasks`. SOP generation μέσω `secretary-agent` edge function.

### 6. `src/pages/Onboarding.tsx`
- Προσθήκη `'workspace' | 'services' | 'templates'` στο WizardStep type
- Νέα σειρά: welcome → company → workspace → profile → services → templates → team → client → docs → ai-setup → ready
- State: `activePreset: WorkspacePreset | null`
- Render τα 3 νέα components στα αντίστοιχα steps

## Προσαρμογές σε σχέση με το αρχείο

Το DB schema έχει ήδη πλούσια δομή στα `services` και `project_templates`. Θα γίνει mapping:
- Services: `name`, `list_price`, `pricing_unit`, `company_id`, `is_active`, `category` (= preset type)
- Templates: `name`, `description`, `project_type` (= preset type), `company_id`
- Template tasks: `template_id`, `title`, `sort_order`

