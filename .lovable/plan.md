
# Επαναφορά Templates & Εμφάνιση στη Δημιουργία Έργου

## Πρόβλημα

Τα 7 έτοιμα templates υπάρχουν στη βάση αλλά δεν εμφανίζονται γιατί έχουν `company_id = NULL`, ενώ οι κανόνες ασφαλείας απαιτούν `company_id = get_user_company_id(...)`. Αποτέλεσμα: κανένας χρήστης δεν τα βλέπει.

## Λύση

### 1. Ενημέρωση κανόνων πρόσβασης (Migration)

Αλλαγή στους κανόνες ώστε:
- **SELECT**: Οι χρήστες βλέπουν τα templates της εταιρείας τους **ΚΑΙ** τα global (company_id IS NULL)
- **ALL (CRUD)**: Managers/Admins διαχειρίζονται μόνο τα εταιρικά τους templates
- Ίδια λογική και για deliverables/tasks που ανήκουν σε templates

Αυτό σημαίνει ότι τα 7 seed templates θα εμφανιστούν αμέσως σε όλους ως "global/system" templates, ενώ κάθε εταιρεία μπορεί να δημιουργήσει και τα δικά της.

### 2. Εμφάνιση templates στη δημιουργία έργου

Στη σελίδα Projects, η λίστα templates ήδη φορτώνεται (fetchTemplates) και υπάρχει selector. Με τη διόρθωση RLS, τα templates θα εμφανίζονται αυτόματα χωρίς αλλαγή κώδικα στο frontend.

### 3. Οπτική διαφοροποίηση (μικρή αλλαγή UI)

Στο `ProjectTemplatesManager`, τα global templates (χωρίς company_id) θα εμφανίζονται με ένδειξη "System" και χωρίς δυνατότητα επεξεργασίας/διαγραφής -- μόνο αντιγραφή.

## Τεχνικές Λεπτομέρειες

### Migration SQL

```text
-- Drop & recreate SELECT policy on project_templates
-- New condition: company_id = get_user_company_id(uid) OR company_id IS NULL

-- Same pattern for project_template_deliverables and project_template_tasks
-- JOIN to parent template and check company_id IS NULL as alternative
```

### Αλλαγή UI

| Αρχείο | Αλλαγή |
|--------|--------|
| Migration SQL | Ενημέρωση 3 SELECT + 2 SELECT πολιτικών |
| `ProjectTemplatesManager.tsx` | Badge "System" + απενεργοποίηση edit/delete για global templates |

### Ροή μετά τη διόρθωση

```text
1. Χρήστης ανοίγει /blueprints -> Project Templates
   -> Βλέπει 7 system templates + τυχόν εταιρικά

2. Χρήστης πατάει "+ Νέο Έργο"
   -> Στο dropdown "Template" βλέπει τα 7 templates
   -> Επιλέγει ένα -> auto-fill τύπου, budget κλπ
   -> Μετά τη δημιουργία: εφαρμόζονται deliverables & tasks

3. Χρήστης μπορεί να αντιγράψει system template
   -> Δημιουργείται εταιρικό αντίγραφο που μπορεί να επεξεργαστεί
```
