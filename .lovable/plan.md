# Dummy Data: Γέμισμα εφαρμογής με δοκιμαστικά δεδομένα

## Τι θα δημιουργηθεί

Ένα backend function που θα εισάγει ολοκληρωμένα dummy data σε όλη την εφαρμογή, χρησιμοποιώντας ελληνικά ονόματα και ρεαλιστικά δεδομένα.

### Χρήστες (6 νέοι)


| Όνομα              | Email                                           | Ρόλος   | Τμήμα    |
| ------------------ | ----------------------------------------------- | ------- | -------- |
| Μαρία Παπαδοπούλου | [maria@advize.gr](mailto:maria@advize.gr)       | admin   | Digital  |
| Γιώργος Νικολάου   | [giorgos@advize.gr](mailto:giorgos@advize.gr)   | manager | Creative |
| Ελένη Κωστοπούλου  | [eleni@advize.gr](mailto:eleni@advize.gr)       | member  | Digital  |
| Δημήτρης Αθανασίου | [dimitris@advize.gr](mailto:dimitris@advize.gr) | member  | Creative |
| Σοφία Μαυρίδου     | [sofia@advize.gr](mailto:sofia@advize.gr)       | viewer  | Digital  |
| Νίκος Παπαγεωργίου | [nikos@advize.gr](mailto:nikos@advize.gr)       | billing | -        |


### Τμήματα

- Ενημέρωση υπαρχόντων (Digital, Creative) με heads
- Διοίκηση (C-level & Heads (Director, Managers)
- Λογιστήριο
- Γραμματεία
- Εκδηλώσεις

### Οργανόγραμμα

- Πλήρης ιεραρχία: CEO -> Heads -> Members

### Πελάτες

- 3 νέοι: Vodafone, Cosmote, Alpha Bank

### Έργα (6 νέα)

- Σε διάφορα stages (active, proposal, completed)
- Με deliverables, tasks, team assignments

### Tasks (~30 νέα)

- Σε κάθε project, διαφορετικά status, assigned σε χρήστες

### Υπηρεσίες (Services)

- 6 υπηρεσίες: Social Media Management, Web Development, Branding, SEO, Media Buying, Content Creation

### Συμβάσεις (Contracts)

- 4 συμβάσεις σε projects (active, draft, ended)

### Τιμολόγια (Invoices)

- 8 τιμολόγια (paid, unpaid, overdue)

### Έξοδα (Expenses)

- 10 έξοδα (vendor, overhead, media_spend)

### Leave Types & Requests

- 3 τύποι: Κανονική, Ασθένεια, Άδεια άνευ
- Balances για κάθε χρήστη
- 5 αιτήματα αδείας (pending, approved, rejected)

### Timesheets

- 30+ time entries για τις τελευταίες 2 εβδομάδες

---

## Τεχνική Υλοποίηση

### 1. Edge Function: `seed-dummy-data`

Νέο backend function που:

- Δημιουργεί χρήστες μέσω Admin API (auth.admin.createUser)
- Εισάγει δεδομένα σε όλους τους πίνακες με service role key (bypasses RLS)
- Ελέγχει αν τα δεδομένα υπάρχουν ήδη (idempotent)
- Επιστρέφει σύνοψη τι δημιουργήθηκε

### 2. Σειρά εισαγωγής (λόγω foreign keys)

```text
1. Users (auth + profiles + roles)
2. Departments (+ assign heads)
3. Org Chart Positions
4. Clients
5. Projects (+ project_user_access)
6. Deliverables
7. Tasks
8. Services
9. Contracts
10. Invoices
11. Expenses
12. Leave Types + Balances + Requests
13. Time Entries
```

### 3. Κλήση από UI

Προσωρινό κουμπί στο Settings ή απευθείας κλήση μέσω browser console. Εναλλακτικά, θα τρέξει αυτόματα με curl μετά το deploy.

### Αρχεία


| Αρχείο                                        | Ενέργεια                   |
| --------------------------------------------- | -------------------------- |
| `supabase/functions/seed-dummy-data/index.ts` | Νέο - edge function seeder |


Κωδικός πρόσβασης για όλους τους dummy χρήστες: `Test123!`