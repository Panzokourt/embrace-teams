

# Multi-Company Management — Company Switcher & Δημιουργία Πολλαπλών Εταιρειών

## Τρέχουσα Κατάσταση

Η βάση **ήδη υποστηρίζει** πολλαπλές εταιρείες ανά χρήστη (`user_company_roles` με composite key `user_id + company_id`). Ο `WorkspaceSelector` υπάρχει αλλά εμφανίζεται μόνο κατά το login. Δεν υπάρχει τρόπος να δημιουργήσεις νέα εταιρεία ή να αλλάξεις εταιρεία **μέσα από την εφαρμογή** αφού έχεις μπει.

## Ορολογία

Προτείνω να χρησιμοποιούμε **"Εταιρεία"** παντού στο UI (αντί για "Organization" ή "Workspace"). Στη βάση παραμένει `companies`. Κάθε εταιρεία = ξεχωριστό ΑΦΜ, ξεχωριστά δεδομένα.

## Αλλαγές

### 1. Company Switcher στο TopBar
Προσθήκη dropdown αριστερά στο TopBar που δείχνει:
- Το logo + όνομα της τρέχουσας εταιρείας
- Dropdown με όλες τις εταιρείες του χρήστη
- Κουμπί "+ Νέα εταιρεία" στο κάτω μέρος (οδηγεί σε dialog δημιουργίας)

Το dropdown θα καλεί `switchCompany()` από το AuthContext — η λογική re-fetch permissions υπάρχει ήδη.

### 2. Create Company Dialog
Νέο component `CreateCompanyDialog` — ο χρήστης δίνει:
- Όνομα εταιρείας
- Domain (ανεξάρτητο από το email domain)
- ΑΦΜ (προαιρετικό)

Αυτό καλεί `create_company_with_owner` RPC (υπάρχει ήδη), μετά κάνει refresh και switch στη νέα εταιρεία.

### 3. Domain Flexibility
Σήμερα το `create_company_with_owner` δέχεται domain παράμετρο ελεύθερα — δεν απαιτεί matching με το email. Αυτό είναι ήδη σωστό. Ο χρήστης με `koupant@gmail.com` μπορεί να δημιουργήσει εταιρεία με domain `advize.gr` και μια άλλη με domain `mscomm.gr`.

### 4. Ασφάλεια
- Ο `create_company_with_owner` χρησιμοποιεί `auth.uid()` — ασφαλές
- Κάθε νέα εταιρεία δημιουργεί αυτόματα owner role — ασφαλές
- Τα RLS policies φιλτράρουν ήδη με `company_id` — τα δεδομένα είναι πλήρως απομονωμένα
- Δεν χρειάζεται αλλαγή στη βάση

## Αρχεία

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/components/layout/CompanySwitcher.tsx` | **Νέο** — Dropdown με εταιρείες + "Νέα εταιρεία" |
| `src/components/layout/CreateCompanyDialog.tsx` | **Νέο** — Dialog δημιουργίας εταιρείας |
| `src/components/layout/TopBar.tsx` | Προσθήκη `<CompanySwitcher />` αριστερά, πριν το search |

Δεν απαιτούνται αλλαγές σε database, AuthContext ή RLS — η υποδομή υπάρχει ήδη.

