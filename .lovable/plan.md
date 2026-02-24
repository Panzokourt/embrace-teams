

# Ασφάλεια Multi-Tenant: Πλήρης Αποκατάσταση RLS Policies

## Το Πρόβλημα

Εντοπίστηκε **κρίσιμο κενό ασφαλείας**: η συνάρτηση `is_admin_or_manager()` ελέγχει αν ο χρήστης είναι admin/manager **χωρίς να φιλτράρει ανά εταιρεία**. Αποτέλεσμα: ένας χρήστης που είναι admin σε εταιρεία Α μπορεί να δει **όλα τα δεδομένα** από εταιρεία Β.

Συγκεκριμένα, ο χρήστης `info@advize.gr` (owner στην "Advize") μπορεί να δει projects, tasks, expenses, invoices κλπ. της "Default Company" γιατί:
- Εχει `admin` role στον πίνακα `user_roles` (legacy)
- Η `is_admin_or_manager()` ελέγχει μόνο αν υπάρχει ο ρόλος, χωρίς company scoping
- Πάνω από 30 RLS policies χρησιμοποιούν `is_admin_or_manager(auth.uid())` χωρίς φίλτρο company_id

## Λύση

### Βήμα 1: Νέα Security Definer Function

Δημιουργία `is_company_admin_or_manager(_user_id uuid, _company_id uuid)` που ελέγχει ρόλο **εντός συγκεκριμένης εταιρείας**:

```sql
CREATE OR REPLACE FUNCTION public.is_company_admin_or_manager(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles
    WHERE user_id = _user_id 
    AND company_id = _company_id 
    AND role IN ('owner', 'admin', 'manager')
    AND status = 'active'
  )
$$;
```

### Βήμα 2: Ενημέρωση Πινάκων ΜΕ company_id

Πίνακες που ήδη έχουν `company_id` αλλά χρησιμοποιούν `is_admin_or_manager()` χωρίς φίλτρο. Θα αλλαχτούν σε:

```sql
is_company_admin_or_manager(auth.uid(), company_id)
```

Αφορά: `billing_notifications`, `services`, `work_day_logs`, `work_schedules`

### Βήμα 3: Ενημέρωση Πινάκων ΧΩΡΙΣ company_id (μέσω project)

Πίνακες που συνδέονται με projects (deliverables, tasks, comments, creatives κλπ.). Η λογική γίνεται:

```sql
EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = <table>.project_id
  AND is_company_admin_or_manager(auth.uid(), p.company_id)
)
```

Αφορά: `projects`, `tasks`, `deliverables`, `comments`, `contracts`, `expenses`, `invoices`, `time_entries`, `media_plans`, `media_plan_items`, `project_creatives`, `project_contact_access`, `project_team_access`, `project_user_access`, `file_attachments`, `file_folders`, `project_templates`, `project_template_tasks`, `project_template_deliverables`, `task_templates`

### Βήμα 4: Ενημέρωση Πινάκων Tenders

Tenders, tender_tasks, tender_deliverables, tender_evaluation_criteria, tender_suggestions, tender_team_access -- μέσω tender -> company_id.

### Βήμα 5: Fix `has_project_access` Function

Η τρέχουσα `has_project_access` δίνει πρόσβαση σε admin/manager χωρίς company check. Θα προστεθεί:

```sql
-- Αντικατάσταση:
EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role IN ('admin','manager'))
-- Με:
EXISTS (
  SELECT 1 FROM projects p
  JOIN user_company_roles ucr ON ucr.company_id = p.company_id
  WHERE p.id = _project_id AND ucr.user_id = _user_id
  AND ucr.role IN ('owner','admin','manager') AND ucr.status = 'active'
)
```

### Βήμα 6: Fix `is_admin_or_manager` Function

Η legacy function θα ενημερωθεί ώστε να ελέγχει μόνο `user_company_roles` με company context (αφαιρεί τον έλεγχο στο legacy `user_roles` table):

```sql
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles
    WHERE user_id = _user_id 
    AND role IN ('owner', 'admin', 'manager')
    AND status = 'active'
  )
$$;
```

Αυτό επηρεάζει αυτόματα όλες τις policies που ήδη χρησιμοποιούν `is_admin_or_manager` **μαζί** με company_id check (departments, leave_requests κλπ.).

---

## Πλήρης Λίστα Πινάκων προς Ενημέρωση (30+)

| Πίνακας | Τρόπος Scoping |
|---------|---------------|
| `activity_log` | Μέσω company_id (αν υπάρχει) ή user-level |
| `billing_notifications` | company_id |
| `briefs` | Μέσω project -> company_id |
| `calendar_event_attendees` | Μέσω event -> company_id |
| `comments` | Μέσω project -> company_id |
| `contracts` | Μέσω project/client -> company_id |
| `deliverables` | Μέσω project -> company_id |
| `expenses` | Μέσω project -> company_id |
| `file_attachments` | Μέσω project/tender -> company_id |
| `file_folders` | Μέσω project/tender -> company_id |
| `invoices` | Μέσω project/client -> company_id |
| `media_plans` | Μέσω project -> company_id |
| `media_plan_items` | Μέσω media_plan -> project -> company_id |
| `project_contact_access` | Μέσω project -> company_id |
| `project_creatives` | Μέσω project -> company_id |
| `project_team_access` | Μέσω project -> company_id |
| `project_templates` | company_id |
| `project_template_tasks` | Μέσω template -> company_id |
| `project_template_deliverables` | Μέσω template -> company_id |
| `project_user_access` | Μέσω project -> company_id |
| `projects` | company_id |
| `services` | company_id |
| `task_templates` | Μέσω project -> company_id |
| `tasks` | Μέσω project -> company_id |
| `team_members` | Μέσω team -> company_id |
| `tender_*` (6 πίνακες) | Μέσω tender -> company_id |
| `time_entries` | company_id |
| `work_day_logs` | company_id |
| `work_schedules` | company_id |

---

## Onboarding Flow -- Τρέχουσα Κατάσταση

Η ροή σύνδεσης/εγγραφής είναι **σωστά σχεδιασμένη**:

1. **Νέος χρήστης με εταιρικό email** → `auto_onboard_user()` βρίσκει εταιρεία με ίδιο domain → δημιουργεί join request → αναμονή έγκρισης
2. **Νέος χρήστης χωρίς εταιρεία** → Onboarding screen: δημιουργία εταιρείας ή αποδοχή πρόσκλησης
3. **Χρήστης με πολλές εταιρείες** → Workspace Selector

Το πρόβλημα **δεν** είναι στο onboarding flow αλλά στα RLS policies που δεν φιλτράρουν σωστά ανά εταιρεία.

---

## Τεχνικά Βήματα Υλοποίησης

1. Migration SQL με:
   - `CREATE FUNCTION is_company_admin_or_manager()`
   - `DROP + RECREATE` ολων των affected policies (30+)
   - `ALTER FUNCTION is_admin_or_manager()` update
   - `ALTER FUNCTION has_project_access()` update
2. Κανένα frontend αλλαγή -- η ασφάλεια εφαρμόζεται στη βάση δεδομένων
3. Test ότι ο χρήστης `info@advize.gr` δεν βλέπει δεδομένα "Default Company"

