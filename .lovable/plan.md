

# Διορθώσεις: Συμβόλαια στο Έργο & Αποθήκευση Ρυθμίσεων

## Πρόβλημα 1: Δεν φαίνονται τα Συμβόλαια στο Έργο

Η `ProjectContractsCard` εμφανίζεται μόνο στο Overview tab και **κάνει return null αν δεν υπάρχουν contracts**. Δεν υπάρχει ξεχωριστό tab "Συμβόλαια" ούτε τρόπος να δει ή προσθέσει ο χρήστης συμβόλαια.

### Λύση
- Η `ProjectContractsCard` στο Overview να εμφανίζεται **πάντα** (ακόμα κι αν δεν υπάρχουν contracts), με empty state και κουμπί "Προσθήκη Συμβολαίου"
- Προσθήκη κουμπιού upload contract απευθείας από την κάρτα (ανοίγει FileUploadDialog με document_type=contract)
- Εναλλακτικά: δυνατότητα manual σύνδεσης υπάρχοντος αρχείου ως contract

## Πρόβλημα 2: Ρυθμίσεις φακέλων αποθηκεύονται αυτόματα

Τώρα κάθε add/delete στο `ProjectFolderTemplatesManager` κάνει **άμεσο INSERT/DELETE** στη βάση χωρίς κουμπί "Αποθήκευση". Ο χρήστης δεν έχει έλεγχο.

### Λύση
- Αλλαγή σε **local state editing**: φόρτωση templates → τοπική επεξεργασία (add/remove/reorder) → κουμπί **"Αποθήκευση"** κάνει batch save
- Κουμπί "Ακύρωση" για reset στην τελευταία αποθηκευμένη κατάσταση
- Dirty state tracking: το κουμπί Αποθήκευση ενεργοποιείται μόνο αν υπάρχουν αλλαγές

## Αρχεία

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/components/projects/ProjectContractsCard.tsx` | Εμφάνιση πάντα με empty state + κουμπί upload contract |
| `src/components/settings/ProjectFolderTemplatesManager.tsx` | Μετατροπή σε local-state editing με explicit Save button |

