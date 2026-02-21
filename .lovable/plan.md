

# Ευρετήριο Επαφών — Contacts Directory

## Επισκόπηση

Δημιουργία ενός ενιαίου **Ευρετηρίου Επαφών** (`/contacts`) που θα περιλαμβάνει προμηθευτές, συνεργάτες, φορείς, δημοσιογράφους, influencers, εταιρείες, φυσικά πρόσωπα — και τους υπάρχοντες πελάτες. Κάθε επαφή θα έχει δική της καρτέλα, tags, στοιχεία επικοινωνίας, και θα μπορεί να χρησιμοποιηθεί σε ολόκληρη την εφαρμογή (ομάδα έργου, τιμολόγια, κλπ). Εξωτερικοί συνεργάτες θα μπορούν να λάβουν πρόσκληση για περιορισμένη πρόσβαση.

---

## 1. Database — Νέος Πίνακας `contacts`

Δημιουργία πίνακα `contacts` με τα εξής πεδία:

| Στήλη | Τύπος | Περιγραφή |
|-------|-------|-----------|
| id | uuid PK | |
| company_id | uuid FK -> companies | Εταιρεία που τον δημιούργησε |
| name | text NOT NULL | Ονοματεπώνυμο / Επωνυμία |
| entity_type | text | `person`, `company`, `organization` |
| email | text | Κύριο email |
| phone | text | Τηλέφωνο |
| secondary_phone | text | Δεύτερο τηλέφωνο |
| address | text | Διεύθυνση |
| website | text | Ιστοσελίδα |
| tax_id | text | ΑΦΜ |
| notes | text | Σημειώσεις |
| tags | text[] | Tags: freelancer, influencer, journalist, κλπ |
| category | text | Κατηγορία: supplier, partner, media, government, κλπ |
| client_id | uuid FK -> clients, nullable | Αν αντιστοιχεί σε υπάρχοντα πελάτη |
| is_active | boolean default true | |
| avatar_url | text | Φωτογραφία/Logo |
| created_at, updated_at | timestamptz | |

Δημιουργία πίνακα `contact_tags` (predefined tags ανά company):

| Στήλη | Τύπος |
|-------|-------|
| id | uuid PK |
| company_id | uuid FK |
| name | text |
| color | text |

Σύνδεση contact με έργα — πίνακας `project_contact_access`:

| Στήλη | Τύπος |
|-------|-------|
| id | uuid PK |
| project_id | uuid FK |
| contact_id | uuid FK |
| role | text (supplier, collaborator, subcontractor...) |

RLS Policies:
- SELECT: Ενεργοί χρήστες βλέπουν contacts της εταιρείας τους
- INSERT/UPDATE/DELETE: Admin/Manager μόνο
- contact_tags: Ίδια λογική

---

## 2. Μετεγκατάσταση Πελατών

- Κάθε υπάρχων client θα αποκτήσει αυτόματα μια αντίστοιχη εγγραφή στον πίνακα `contacts` μέσω migration (INSERT...SELECT)
- Η στήλη `client_id` στο contact θα δείχνει στον αρχικό client
- Η σελίδα Πελατών (`/clients`) **παραμένει** ως έχει
- Στο Ευρετήριο, οι πελάτες θα εμφανίζονται με ειδικό badge "Πελάτης"

---

## 3. Σελίδα Ευρετηρίου — `/contacts`

### Κύρια προβολή
- Table view με στήλες: Όνομα, Τύπος, Κατηγορία, Tags, Email, Τηλέφωνο, Ενέργειες
- Αναζήτηση full-text (όνομα, email, tags)
- Φίλτρα: κατηγορία, entity_type, tags
- Export CSV
- Κουμπί "Νέα Επαφή"

### Καρτέλα Επαφής — `/contacts/:id`
- Header με avatar, όνομα, κατηγορία, tags
- Στοιχεία επικοινωνίας (email, τηλέφωνα, διεύθυνση, website, ΑΦΜ)
- Tab "Έργα": λίστα έργων στα οποία συμμετέχει (μέσω project_contact_access)
- Tab "Τιμολόγια": τιμολόγια που σχετίζονται (αν είναι πελάτης, μέσω client_id)
- Tab "Σημειώσεις"
- Αν είναι πελάτης: link προς `/clients/:id`

---

## 4. Ενσωμάτωση στην Εφαρμογή

### Ομάδα Έργου (ProjectTeamManager)
- Νέο section "Εξωτερικοί Συνεργάτες" κάτω από την ομάδα
- Dropdown/search για επιλογή contact από το Ευρετήριο
- Ρόλος (supplier, collaborator, subcontractor, consultant)
- Αποθήκευση στο `project_contact_access`

### Τιμολόγια (InvoicesManager)
- Στο dropdown πελάτη, εμφάνιση και contacts που δεν είναι πελάτες (π.χ. προμηθευτές για expenses)

### Global Search (TopBar)
- Προσθήκη contacts στα αποτελέσματα αναζήτησης

---

## 5. Πρόσκληση Εξωτερικού Συνεργάτη

- Κουμπί "Πρόσκληση" στην καρτέλα contact
- Χρήση του υπάρχοντος μηχανισμού `invitations` με ρόλο `standard` και `access_scope: assigned`
- Ανάθεση project_ids: μόνο τα έργα στα οποία ο contact είναι assigned
- Ο εξωτερικός συνεργάτης βλέπει μόνο τα tasks/deliverables των έργων που του έχουν ανατεθεί

---

## 6. Navigation

- Νέο nav item στο sidebar: `{ title: 'Ευρετήριο', href: '/contacts', icon: BookUser }`
- Τοποθέτηση κάτω από τα Timesheets, πριν το HR

---

## Αρχεία που Δημιουργούνται / Αλλάζουν

| Αρχείο | Αλλαγή |
|--------|--------|
| **Migration SQL** | Δημιουργία `contacts`, `contact_tags`, `project_contact_access` + RLS + seed clients |
| `src/pages/Contacts.tsx` | **Νέο** — Σελίδα ευρετηρίου |
| `src/pages/ContactDetail.tsx` | **Νέο** — Καρτέλα επαφής |
| `src/components/contacts/ContactsTableView.tsx` | **Νέο** — Table view |
| `src/components/contacts/ContactForm.tsx` | **Νέο** — Dialog δημιουργίας/επεξεργασίας |
| `src/components/contacts/ContactSelector.tsx` | **Νέο** — Reusable dropdown για επιλογή contact |
| `src/components/projects/ProjectTeamManager.tsx` | Προσθήκη section εξωτερικών συνεργατών |
| `src/components/layout/AppSidebar.tsx` | Νέο nav item |
| `src/App.tsx` | Routes `/contacts` και `/contacts/:id` |
| `src/components/layout/TopBar.tsx` | Contacts στο global search |

---

## Τεχνικές Σημειώσεις

- Ο πίνακας `clients` **δεν αλλάζει** — η σχέση γίνεται μέσω `contacts.client_id`
- Τα tags αποθηκεύονται ως `text[]` στο contact για ταχύτητα, ενώ τα predefined tags είναι στο `contact_tags`
- Η πρόσκληση χρησιμοποιεί τον υπάρχοντα μηχανισμό invitations (accept_invitation function) χωρίς αλλαγές στο backend
- RLS policies χρησιμοποιούν τις υπάρχουσες security definer functions (`get_user_company_id`, `is_admin_or_manager`, `is_active_user`)

