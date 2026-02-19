
# Enterprise Auth & Multi-tenant System

Πλήρης αναδιάρθρωση του συστήματος authentication, organizations και ρόλων σε enterprise-grade αρχιτεκτονική.

---

## Φάση 1: Database Migration

### 1A. Αλλαγή Role Enum
Αντικατάσταση του `company_role` enum:
- `super_admin` -> `owner`
- `admin` -> παραμένει
- `manager` -> παραμένει
- `standard` -> `member`
- `client` -> αφαιρείται
- Νέοι: `viewer`, `billing`

Ενημέρωση υπάρχοντων δεδομένων (`UPDATE user_company_roles SET role = 'owner' WHERE role = 'super_admin'` κτλ).

### 1B. Νέος πίνακας `join_requests`
Για αιτήματα εισόδου μέσω corporate email domain:
- `id`, `user_id`, `company_id`, `status` (pending/approved/rejected), `reviewed_by`, `reviewed_at`, `created_at`
- RLS: χρήστης βλέπει τα δικά του, admin βλέπει τα εταιρικά

### 1C. Επέκταση πίνακα `companies`
Προσθήκη στηλών:
- `domain_verified` (boolean, default false)
- `sso_enforced` (boolean, default false)
- `allow_domain_requests` (boolean, default true)

### 1D. Ενημέρωση security functions
Αντικατάσταση αναφορών σε `super_admin` με `owner` σε όλες τις DB functions (`is_super_admin`, `is_company_admin`, κτλ).

---

## Φάση 2: Auth Context & Routing

### 2A. Ανανέωση AuthContext
- Ενημέρωση type `CompanyRole` σε: `'owner' | 'admin' | 'manager' | 'member' | 'viewer' | 'billing'`
- Νέα post-login λογική:
  - 0 organizations -> redirect `/onboarding`
  - 1 organization -> redirect `/` (κατευθείαν)
  - 2+ organizations -> redirect `/select-workspace`
- Αποθήκευση `activeCompanyId` στο state
- `switchCompany(companyId)` function

### 2B. Νέες σελίδες / Routes

| Route | Σελίδα | Περιγραφή |
|-------|--------|-----------|
| `/auth` | Auth (ανανεωμένη) | Login/Signup + Google OAuth |
| `/onboarding` | Onboarding | Create org ή accept invite ή domain join |
| `/select-workspace` | WorkspaceSelector | Επιλογή organization |
| `/accept-invite/:token` | AcceptInvite | Αποδοχή πρόσκλησης |
| `/settings/organization` | OrgSettings | Ρυθμίσεις εταιρείας |
| `/settings/members` | MembersManagement | Διαχείριση μελών |
| `/settings/security` | SecuritySettings | Domain, SSO, sessions |

---

## Φάση 3: Auth Page (ανανέωση)

- Login form (email + password)
- Signup form (name + email + password)
- Google OAuth button (μέσω `lovable.auth.signInWithOAuth("google")`)
- Microsoft button disabled με "Coming soon" label
- Branding Olseny (logo, χρώματα)
- Redirect logic μετά το login βάσει αριθμού organizations

---

## Φάση 4: Onboarding Flow

Σελίδα με 3 επιλογές:

**A) Δημιουργία Εταιρείας**
- Φόρμα: Company name, domain
- Ο χρήστης γίνεται `owner`
- Auto-set domain από email αν είναι εταιρικό

**B) Αποδοχή Πρόσκλησης**
- Input token ή αυτόματα αν ήρθε από link
- Κλήση `accept_invitation(token)` (ήδη υπάρχει)

**C) Αίτημα εισόδου βάσει domain**
- Αν το email domain ταιριάζει με εταιρεία που έχει `allow_domain_requests = true`
- Δημιουργείται εγγραφή στο `join_requests` με status `pending`
- Μήνυμα "Το αίτημά σας στάλθηκε στον admin"

---

## Φάση 5: Workspace Selector

- Λίστα εταιρειών στις οποίες ανήκει ο χρήστης
- Κάρτες με logo, όνομα, ρόλος
- Κλικ -> `switchCompany(id)` -> redirect `/`
- Κουμπί "Δημιουργία νέας εταιρείας"

---

## Φάση 6: Organization Settings

### Members Management
- Πίνακας μελών με ρόλο, status, last login
- Αλλαγή ρόλου (Owner, Admin, Manager, Member, Viewer, Billing)
- Suspend/Deactivate
- Pending join requests (approve/reject)
- Invitations list με ανάκληση

### Domain & Security Settings
- Domain verification (εμφάνιση domain, toggle `allow_domain_requests`)
- SSO enforcement toggle
- Active sessions listing (placeholder)

### Organization General
- Όνομα, logo, domain
- Ownership transfer (Owner only)
- Danger zone: delete organization

---

## Φάση 7: Permission Updates

Ενημέρωση `hasPermission` function:
- `owner`: πλήρης πρόσβαση σε ΟΛΑ
- `admin`: πρόσβαση σε όλα εκτός billing/SSO
- `manager`: projects, tasks, deliverables
- `member`: κανονική χρήση assigned
- `viewer`: μόνο view permissions
- `billing`: μόνο `settings.billing`, `financials.view`

Ενημέρωση sidebar visibility βάσει νέων ρόλων.

---

## Τεχνικές Λεπτομέρειες

### Αρχεία που δημιουργούνται

| Αρχείο | Περιγραφή |
|--------|-----------|
| `src/pages/Onboarding.tsx` | Onboarding flow (create/join/request) |
| `src/pages/WorkspaceSelector.tsx` | Επιλογή workspace |
| `src/pages/AcceptInvite.tsx` | Αποδοχή πρόσκλησης |
| `src/pages/OrganizationSettings.tsx` | Ρυθμίσεις organization |
| `src/components/auth/GoogleAuthButton.tsx` | Google OAuth button |
| DB Migration SQL | Enum changes, new table, company columns |

### Αρχεία που τροποποιούνται

| Αρχείο | Αλλαγές |
|--------|---------|
| `src/contexts/AuthContext.tsx` | Νέοι ρόλοι, multi-org logic, switchCompany |
| `src/pages/Auth.tsx` | Google OAuth, νέο branding, post-login redirect |
| `src/App.tsx` | Νέα routes |
| `src/components/layout/AppLayout.tsx` | Active company check |
| `src/components/layout/AppSidebar.tsx` | Νέοι ρόλοι, org settings link |
| `src/hooks/useRBAC.ts` | Ενημέρωση ρόλων και permissions |
| `src/components/users/InviteUserDialog.tsx` | Νέοι ρόλοι |
| `supabase/functions/create-user/index.ts` | Νέοι ρόλοι |
| Όλα τα DB security functions | `owner` αντί `super_admin` |

### Σειρά υλοποίησης
1. DB Migration (enum, tables, functions)
2. AuthContext + routing
3. Auth page (Google OAuth + redirect logic)
4. Onboarding + WorkspaceSelector
5. AcceptInvite page
6. Organization Settings (members, domain, security)
7. Sidebar + permission updates
8. Edge function updates
