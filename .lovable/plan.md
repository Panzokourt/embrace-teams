

# Ενισχυμένο Project Creation Wizard

## Τι αλλάζει

Οταν ο χρήστης επιλέγει template στο wizard δημιουργίας project, το παράθυρο θα γίνεται δυναμικό:

### 1. Preview παραδοτέων και tasks με checkboxes
- Οταν επιλεγεί template, φορτώνονται τα deliverables και tasks του
- Εμφανίζονται ως λίστα με checkboxes (ολα pre-selected)
- Ο χρήστης μπορεί να αποεπιλέξει οτι δεν χρειάζεται πριν πατήσει "Δημιουργία"
- Εμφάνιση budget ανά deliverable και estimated hours ανά task

### 2. Δυναμικά πεδία ανά τύπο έργου
- Ανάλογα με το `project_type` του template, εμφανίζονται extra πεδία:
  - **Event**: Τοποθεσία, Αριθμός ατόμων, Ημ/νία Event
  - **Digital Campaign**: Target Audience, Platforms (multi-select checkboxes: Facebook, Instagram, Google, LinkedIn, TikTok)
  - **PR**: Target Media, Key Messages
  - **Social Media**: Platforms, Posting Frequency
  - **Branding**: Brand Elements (Logo, Guidelines, Identity)
  - **Production**: Format, Duration
- Αυτά τα πεδία αποθηκεύονται σε ενα `metadata` jsonb column στον πίνακα projects

### 3. Βελτιωμένο UI wizard
- Το template selector section γίνεται πιο prominent (Step 1)
- Κατω από τα βασικά πεδία εμφανίζεται collapsible section "Template Preview" με deliverables/tasks
- Τα δυναμικά πεδία εμφανίζονται σε ξεχωριστό section με τίτλο ανάλογο του τύπου

## Technical Details

### Database Migration
Προσθήκη `metadata` jsonb column στον πίνακα `projects`:
```sql
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
```

### Αλλαγές αρχείων

**`src/pages/Projects.tsx`**:
- Οταν αλλάζει template, fetch deliverables + tasks και αποθήκευσή τους σε state
- Render checkboxes για deliverables και tasks (pre-checked)
- Render δυναμικά πεδία βάσει `project_type` του template
- Κατά τη δημιουργία, πέρασμα μόνο selected items στο `applyTemplate`
- Αποθήκευση δυναμικών πεδίων στο `metadata`

**`src/hooks/useProjectTemplates.ts`**:
- Τροποποίηση `applyTemplate` ωστε να δέχεται `selectedDeliverableIndices` και `selectedTaskIndices`
- Δημιουργεί μόνο τα επιλεγμένα items

**Νέο component `src/components/projects/TemplatePreview.tsx`**:
- Δέχεται deliverables/tasks arrays + selection state
- Εμφανίζει checkboxes με ονόματα, budgets, hours
- Σύνοψη (π.χ. "5/8 παραδοτέα, 12/15 tasks")

**Νέο component `src/components/projects/DynamicProjectFields.tsx`**:
- Δέχεται `projectType` string
- Render τα κατάλληλα πεδία ανάλογα τον τύπο
- Επιστρέφει values ως `metadata` object

### Σειρά υλοποίησης
1. Database migration (metadata column)
2. DynamicProjectFields component
3. TemplatePreview component
4. Ενημέρωση useProjectTemplates hook
5. Ενημέρωση Projects.tsx wizard

