

# Επέκταση Ρυθμίσεων Εταιρείας — Πλήρη Στοιχεία

## Τρέχουσα κατάσταση
Η φόρμα έχει μόνο: Όνομα, Domain, Περιγραφή, Κλάδος, Ζώνη ώρας, Γλώσσα. Όλα εκτός name/domain αποθηκεύονται στο `settings` JSONB column.

## Προτεινόμενη δομή — Οργάνωση σε sections

### Section 1: Βασικά στοιχεία (υπάρχει ήδη)
- Όνομα εταιρείας, Domain, Περιγραφή, Λογότυπο (upload)

### Section 2: Νομικά & Φορολογικά στοιχεία
- **Μορφή εταιρείας** (ΑΕ, ΕΠΕ, ΙΚΕ, ΟΕ, ΕΕ, Ατομική, Μη Κερδοσκοπική, Άλλο)
- **ΑΦΜ** (με validation 9 ψηφίων)
- **ΔΟΥ**
- **Αρ. ΓΕΜΗ**
- **Νόμισμα** (EUR, USD, GBP)

### Section 3: Στοιχεία Επικοινωνίας
- **Τηλέφωνο** (κύριο)
- **Fax**
- **Email εταιρείας**
- **Website**

### Section 4: Διεύθυνση
- **Οδός & αριθμός**
- **Πόλη**
- **Τ.Κ.**
- **Χώρα**

### Section 5: Social Media & Online Presence
- **LinkedIn URL**
- **Facebook URL**
- **Instagram URL**
- **X (Twitter) URL**

### Section 6: Επιχειρησιακά
- **Κλάδος** (υπάρχει)
- **Μέγεθος εταιρείας** (υπάρχει στο DB)
- **Έτος ίδρυσης**
- **Ζώνη ώρας** (υπάρχει)
- **Γλώσσα** (υπάρχει)

## Τεχνικές αλλαγές

### 1. `src/components/organization/OrgGeneralTab.tsx`
- Αναδιοργάνωση σε collapsible sections με Card components
- Όλα τα νέα πεδία αποθηκεύονται στο `settings` JSONB (δεν χρειάζεται migration εκτός αν θέλουμε dedicated columns)
- Τα `industry` και `company_size` χρησιμοποιούν τα υπάρχοντα DB columns
- Validation: ΑΦΜ (9 ψηφία), email format, URL format, Τ.Κ. (5 ψηφία)
- Logo upload με preview (reuse pattern από OnboardingCompany)

### 2. Database migration
- Κανένα νέο column — τα πεδία μπαίνουν στο `settings` JSONB που υπάρχει ήδη
- Αξιοποίηση του υπάρχοντος `company_size` column

Δεν επηρεάζονται άλλα components — η αλλαγή είναι αποκλειστικά στο `OrgGeneralTab`.

