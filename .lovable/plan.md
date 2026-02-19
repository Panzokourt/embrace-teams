

# Fix: Status "Αναμονή", Role Change & Inline Editing

## Πρόβλημα 1: Status "Αναμονή"

Το `profiles.status` στη βάση είναι `pending` ενώ το `user_company_roles.status` είναι `active`. Η σελίδα Employee Profile διαβάζει από το λάθος πεδίο. Θα:
- Ενημερώσουμε το `profiles.status` σε `active` στη βάση
- Αλλάξουμε την EmployeeProfile να διαβάζει status από `user_company_roles` αντί `profiles`

## Πρόβλημα 2: Αλλαγή Ρόλου δεν δουλεύει

Στο dropdown (UsersTableView, γραμμή 258) χρησιμοποιεί τα παλιά ονόματα ρόλων: `standard`, `client`. Θα αντικατασταθούν με τα σωστά: `admin`, `manager`, `member`, `viewer`, `billing`.

## Πρόβλημα 3: Παλιά role labels

Στο EmployeeProfile.tsx (γραμμές 32-38) χρησιμοποιεί ακόμα `super_admin`, `standard`, `client`. Θα ενημερωθούν σε `owner`, `member`, `viewer`, `billing`.

## Πρόβλημα 4: Inline Editing στο προφίλ χρήστη

Θα προστεθεί inline editing στην EmployeeProfile/EmployeeHeader για τα πεδία:
- **Job Title** (Θέση εργασίας)
- **Phone** (Τηλέφωνο)
- **Hire Date** (Ημ. Πρόσληψης)
- **Full Name** (Ονοματεπώνυμο)

Κάθε πεδίο θα εμφανίζεται κανονικά, και με click θα γίνεται editable (χρησιμοποιώντας το υπάρχον pattern InlineEditCell ή απλό inline editing).

---

## Τεχνικές Αλλαγές

### Αρχεία που τροποποιούνται

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/components/users/UsersTableView.tsx` | Fix role list στο dropdown: `['admin', 'manager', 'member', 'viewer', 'billing']` |
| `src/pages/EmployeeProfile.tsx` | Ενημέρωση roleLabels σε νέους ρόλους, ανάγνωση status από user_company_roles |
| `src/components/hr/EmployeeHeader.tsx` | Προσθήκη inline editing για name, job_title, phone, hire_date |
| `src/pages/UserDetail.tsx` | Ενημέρωση roleLabels σε νέους ρόλους |

### Database fix
- UPDATE profiles SET status = 'active' WHERE id = 'f6fee19b-...' (sync profiles.status με user_company_roles.status)

### Inline editing approach
Στο EmployeeHeader, κάθε πεδίο πληροφοριών (job_title, phone, hire_date) θα μετατραπεί σε editable span. Με click, εμφανίζεται input, με Enter/blur αποθηκεύεται στη βάση (profiles table). Μόνο users με canEdit δικαίωμα (admin/manager) θα μπορούν να επεξεργαστούν.

