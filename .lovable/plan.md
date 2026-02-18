
# HR Section - Ενοποιημένη Διαχείριση Ανθρώπινου Δυναμικού

## Συνοπτική Περιγραφή

Δημιουργία ενός κεντρικού HR Section που ενοποιεί ολες τις σχετικές λειτουργίες (Χρήστες, Ομάδες, Τμήματα, Οργανόγραμμα, Timesheets) σε μία ενιαία σελίδα με tabs, και προσθέτει ολοκληρωμένο σύστημα αδειών/απουσιών και εμπλουτισμένο προφίλ εργαζομένου.

## Τι αλλάζει

### 1. Κεντρική σελίδα HR (`/hr`)
Νέα σελίδα με tabs που ενοποιεί:
- **Προσωπικό** (πρώην Users & Access) - Πίνακας χρηστών με ολες τις λειτουργίες
- **Ομάδες** (πρώην /teams) - Διαχείριση ομάδων
- **Τμήματα** (πρώην /departments) - Οργανωτική δομή
- **Οργανόγραμμα** (πρώην /org-chart) - Οπτικό chart
- **Timesheets** (πρώην /timesheets) - Καταγραφή χρόνου
- **Άδειες & Απουσίες** (ΝΕΟ) - Σύστημα αδειών

Οι παλιές routes (`/users`, `/teams`, `/departments`, `/org-chart`, `/timesheets`) θα ανακατευθύνονται στο `/hr` με το αντίστοιχο tab.

### 2. Σύστημα Αδειών & Απουσιών (Leave Management)
Πλήρες σύστημα με:
- **Τύποι αδειών**: Κανονική, Ασθένεια, Άδεια χωρίς αποδοχές, Τηλεργασία, Εκπαίδευση, Γονική, Ειδική
- **Workflow εγκρίσεων**: Αίτηση -> Εκκρεμεί -> Εγκρίθηκε/Απορρίφθηκε (ο manager/head εγκρίνει)
- **Αυτόματος υπολογισμός**: Δικαιούμενες ημέρες ανά τύπο, υπόλοιπο, χρησιμοποιημένες
- **Ημερολόγιο απουσιών**: Οπτική απεικόνιση ποιος λείπει πότε
- **Ειδοποιήσεις**: Toast/notification στον manager οταν υποβληθεί αίτηση

### 3. Εμπλουτισμένο Προφίλ Εργαζομένου (`/hr/employee/:id`)
Αναβαθμισμένο UserDetail σε στυλ social media profile:
- **Cover photo + μεγάλο avatar** στην κορυφή
- **Στοιχεία επικοινωνίας**: Email, τηλέφωνο, διεύθυνση, emergency contact
- **Tabs** στο προφίλ:
  - Επισκόπηση (γενικά στοιχεία, τμήμα, ομάδες, ρόλος)
  - Έργα & Tasks (τρέχοντα + ιστορικό)
  - Timesheets (ατομικά time entries)
  - Άδειες (ιστορικό + υπόλοιπο)
  - Έγγραφα HR (συμβόλαια, NDAs, μισθοδοσία κλπ)
  - Activity Log (ατομικό ιστορικό ενεργειών)

### 4. HR Documents (Έγγραφα Προσωπικού)
Κάθε εργαζόμενος μπορεί να έχει συνημμένα HR documents:
- Σύμβαση πρόσληψης
- NDAs
- Βεβαιώσεις μισθοδοσίας
- Αξιολογήσεις
- Βεβαιώσεις αποχώρησης

Τα έγγραφα αποθηκεύονται στο storage bucket `hr-documents` με RLS.

### 5. Sidebar Αλλαγές
Αντικατάσταση πολλαπλών links (Ομάδες, Χρήστες, Τμήματα, Οργανόγραμμα, Timesheets) με ένα μοναδικό "HR" link.

## Technical Details

### Database Migration

Νέοι πίνακες:

**`leave_types`** - Τύποι αδειών ανά εταιρεία
```text
id              uuid PK
company_id      uuid FK -> companies
name            text (π.χ. "Κανονική", "Ασθένεια")
code            text (π.χ. "annual", "sick")
color           text
default_days    integer (δικαιούμενες ημέρες/έτος)
requires_approval boolean default true
is_active       boolean default true
created_at      timestamptz
```

**`leave_balances`** - Υπόλοιπο αδειών ανά χρήστη/έτος
```text
id              uuid PK
user_id         uuid FK -> profiles
company_id      uuid FK -> companies
leave_type_id   uuid FK -> leave_types
year            integer
entitled_days   numeric (δικαιούμενες)
used_days       numeric (χρησιμοποιημένες)
pending_days    numeric (σε αναμονή έγκρισης)
carried_over    numeric (μεταφερόμενες)
created_at      timestamptz
updated_at      timestamptz
UNIQUE(user_id, leave_type_id, year)
```

**`leave_requests`** - Αιτήσεις αδειών
```text
id              uuid PK
user_id         uuid FK -> profiles
company_id      uuid FK -> companies
leave_type_id   uuid FK -> leave_types
start_date      date
end_date        date
days_count      numeric
half_day        boolean default false
status          text ('pending','approved','rejected','cancelled')
reason          text
reviewer_id     uuid FK -> profiles (nullable)
reviewed_at     timestamptz
reviewer_notes  text
created_at      timestamptz
updated_at      timestamptz
```

**`hr_documents`** - Έγγραφα HR ανά εργαζόμενο
```text
id              uuid PK
user_id         uuid FK -> profiles
company_id      uuid FK -> companies
document_type   text ('contract','nda','payroll','evaluation','termination','other')
file_name       text
file_path       text (storage path)
file_size       integer
uploaded_by     uuid FK -> profiles
notes           text
valid_from      date
valid_until     date
created_at      timestamptz
```

**Storage bucket**: `hr-documents` (private, με RLS - μόνο admins + ο ίδιος ο χρήστης)

**RLS Policies:**
- `leave_types`: SELECT για ολους, ALL για admin/manager
- `leave_balances`: SELECT δικά τους + admin/manager βλέπει ολα, UPDATE μόνο admin
- `leave_requests`: INSERT δικά τους, SELECT δικά τους + ιεραρχική πρόσβαση, UPDATE (approve/reject) για manager/admin
- `hr_documents`: SELECT δικά τους + admin, INSERT/DELETE admin μόνο

**Default leave types** (seed data):
- Κανονική (annual) - 20 ημέρες
- Ασθένεια (sick) - 15 ημέρες
- Τηλεργασία (remote) - χωρίς όριο
- Εκπαίδευση (training) - 5 ημέρες
- Γονική (parental) - 10 ημέρες
- Χωρίς αποδοχές (unpaid) - χωρίς όριο

### Νέα αρχεία

**Σελίδες:**
- `src/pages/HR.tsx` - Κεντρική σελίδα HR με tabs
- `src/pages/EmployeeProfile.tsx` - Αναβαθμισμένο προφίλ εργαζομένου (αντικαθιστά UserDetail)

**Components HR:**
- `src/components/hr/LeaveRequestForm.tsx` - Φόρμα αίτησης άδειας
- `src/components/hr/LeaveBalanceCard.tsx` - Κάρτα υπολοίπου αδειών
- `src/components/hr/LeaveRequestsList.tsx` - Λίστα αιτήσεων (pending/approved/rejected)
- `src/components/hr/LeaveCalendar.tsx` - Ημερολόγιο απουσιών ομάδας/εταιρείας
- `src/components/hr/LeaveApprovalCard.tsx` - Κάρτα έγκρισης/απόρριψης
- `src/components/hr/HRDocuments.tsx` - Διαχείριση εγγράφων HR
- `src/components/hr/EmployeeHeader.tsx` - Social-media style header με cover+avatar

**Hooks:**
- `src/hooks/useLeaveManagement.ts` - Hook για CRUD αδειών, υπολογισμό υπολοίπου, εγκρίσεις

### Αλλαγές σε υπάρχοντα

**`src/App.tsx`:**
- Νέες routes: `/hr`, `/hr/employee/:id`
- Redirect routes: `/users` -> `/hr`, `/teams` -> `/hr`, `/departments` -> `/hr`, `/org-chart` -> `/hr`, `/timesheets` -> `/hr`
- Αφαίρεση standalone routes για Users, Teams, Departments, OrgChart, Timesheets

**`src/components/layout/AppSidebar.tsx`:**
- Αντικατάσταση links (Ομάδες, Timesheets, Χρήστες, Τμήματα, Οργανόγραμμα) με ένα "HR" link
- Νέο icon: `UserCog` ή `UsersRound`

### HR Page Layout

```text
+--------------------------------------------------+
| HR - Ανθρώπινο Δυναμικό                          |
+--------------------------------------------------+
| [Προσωπικό] [Ομάδες] [Τμήματα] [Οργανόγραμμα]  |
| [Timesheets] [Άδειες]                            |
+--------------------------------------------------+
|                                                    |
|  < Περιεχόμενο αντίστοιχου tab >                  |
|  (Κάθε tab φορτώνει τον αντίστοιχο content        |
|   που ήταν πριν σε ξεχωριστή σελίδα)              |
|                                                    |
+--------------------------------------------------+
```

### Employee Profile Layout

```text
+--------------------------------------------------+
| [Cover Photo / Gradient Background]               |
|    [Avatar]                                        |
|    Ονοματεπώνυμο          [Edit Profile]           |
|    job_title | department | status badge           |
+--------------------------------------------------+
| [Επισκόπηση] [Έργα] [Timesheets] [Άδειες]       |
| [Έγγραφα] [Activity]                              |
+--------------------------------------------------+
|                                                    |
|  Επισκόπηση:                                       |
|  +----------------+  +------------------+          |
|  | Στοιχεία       |  | Υπόλοιπο Αδειών |          |
|  | Email, Phone   |  | Κανονική: 15/20  |          |
|  | Hire date      |  | Ασθένεια: 2/15   |          |
|  | Reports to     |  +------------------+          |
|  +----------------+                                |
|  +----------------+  +------------------+          |
|  | Ομάδες         |  | Πρόσφατη Δρ/τα   |          |
|  | Team A, Team B |  | activity items   |          |
|  +----------------+  +------------------+          |
+--------------------------------------------------+
```

### Leave Request Flow

```text
1. Εργαζόμενος -> Αίτηση Άδειας (τύπος, ημ/νίες, αιτιολογία)
2. Σύστημα -> Υπολογισμός ημερών, έλεγχος υπολοίπου
3. Σύστημα -> Ενημέρωση pending_days στο balance
4. Manager/Admin -> Ειδοποίηση (notification + toast)
5. Manager -> Έγκριση/Απόρριψη + σχόλια
6. Σύστημα -> Ενημέρωση used_days ή αφαίρεση pending_days
7. Εργαζόμενος -> Ειδοποίηση αποτελέσματος
```

### Σειρά Υλοποίησης

1. Database migration (νέοι πίνακες + RLS + seed data + storage bucket)
2. `useLeaveManagement` hook
3. Leave components (form, balance, list, calendar, approval)
4. HR Documents component
5. Employee Profile page (αναβαθμισμένο)
6. HR main page (tabs ενοποίηση)
7. Routing updates (App.tsx redirects)
8. Sidebar update (ένα HR link)
