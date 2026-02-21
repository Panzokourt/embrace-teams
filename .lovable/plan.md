

# Fix: Εμφάνιση όλων των πελατών και κατηγοριών στο Project Tree

## Πρόβλημα

Το auto-organize mode δεν εμφανίζει όλους τους πελάτες και κατηγορίες. Από το screenshot λείπουν πελάτες όπως ΕΔΥΤΕ, ΕΑΠ, CAMPEON, Smart Agro Hub, Πανεπιστήμια κ.ά. παρόλο που έχουν ενεργά έργα.

## Αιτίες

1. **Mapping ασυμφωνία**: Η `sectorToCategory()` αντιστοιχίζει μόνο κλειδιά ("public", "private") αλλά στη βάση αποθηκεύονται ήδη τα ελληνικά ονόματα ("Δημόσιος Τομέας", "Ιδιωτικός Τομέας"). Αν η κατηγορία δεν υπάρχει στον πίνακα `project_categories`, τα έργα πέφτουν στο "Χωρίς Κατηγορία" αλλά μπορεί να μην εμφανίζονται αν το uncategorized section κρύβεται.
2. **Φιλτράρισμα κενών κατηγοριών**: Η γραμμή `if (!bucket || bucket.clients.size === 0) return null` κρύβει κατηγορίες χωρίς αντιστοιχισμένα έργα, αλλά αν η αντιστοίχιση αποτυγχάνει, κρύβονται και κατηγορίες που κανονικά θα είχαν έργα.
3. **Reverse mapping**: Αν το sector ενός client = "Εκπαίδευση" (δεν υπάρχει ούτε στο mapping ούτε στις categories), πάει στο uncategorized αλλά εκεί μπορεί να χάνεται.

## Λύση

### 1. Βελτίωση `sectorToCategory` (useProjectCategories.ts)
- Προσθήκη **reverse mapping** (display name -> display name) ώστε να δουλεύει και αν τα sectors αποθηκεύονται ως ελληνικά ονόματα
- Αν δεν βρεθεί mapping, επιστρέφει το sector ως έχει (fallback λειτουργεί ήδη)

### 2. Robust auto-grouping (SidebarProjectTree.tsx)
- **Αντί να εξαρτάται αποκλειστικά από `project_categories`**, δημιουργεί virtual folders από ΟΛΟΥΣ τους sectors που βρίσκει στα client data
- Αν ένα sector αντιστοιχεί σε κατηγορία, χρησιμοποιεί το χρώμα και τη σειρά της
- Αν δεν αντιστοιχεί, δημιουργεί αυτόματα virtual folder με το sector name
- Αυτό εξασφαλίζει ότι ΚΑΝΕΝΑΣ πελάτης δεν χάνεται

### 3. Εμφάνιση uncategorized
- Το "Χωρίς Κατηγορία" εμφανίζεται πάντα όταν υπάρχουν clients χωρίς sector ή orphan projects

---

## Αρχεία που αλλάζουν

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/hooks/useProjectCategories.ts` | Βελτίωση mapping -- προσθήκη reverse mapping |
| `src/components/layout/SidebarProjectTree.tsx` | Robust grouping -- δημιουργία virtual folders απο ολα τα sectors, οχι μονο απο project_categories |

---

## Τεχνικές λεπτομέρειες

Η νέα λογική auto-grouping:
1. Fetch categories + projects (with client join)
2. Για κάθε project, βρες το category name μέσω `sectorToCategory(client.sector)`
3. Αν το category name υπάρχει στο `project_categories`, χρησιμοποίησε χρώμα/σειρά
4. Αν δεν υπάρχει, δημιούργησε dynamic category bucket
5. Εμφάνισε ΟΛΕΣ τις κατηγορίες (defined + dynamic) ταξινομημένες
6. Στο τέλος, "Χωρίς Κατηγορία" για projects χωρίς client

