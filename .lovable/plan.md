
## Τι βρήκα

1. **Το manual upload του logo αποτυγχάνει λόγω storage policy**
   - Στο `ClientSmartHeader.tsx` το αρχείο ανεβαίνει στο path:
     `client-logos/${client.id}.${ext}`
   - Όμως το bucket `project-files` επιτρέπει insert μόνο όταν το **1ο path segment είναι το auth user id**.
   - Άρα το manual upload χτυπάει σωστά σε RLS/storage restriction, γι’ αυτό βλέπεις το μήνυμα με το row-level security policy.

2. **Το AI Enrich αυτή τη στιγμή δεν επιστρέφει logo στο response**
   - Στο network snapshot το `enrich-client` γύρισε μόνο `suggestions`, χωρίς `logoUrl`.
   - Άρα το dialog δεν έχει τίποτα να εμφανίσει για logo, παρότι το website enrichment τρέχει.

3. **Υπάρχει και δευτερεύον θέμα στο enrich flow**
   - Το `AIEnrichButton` ανοίγει dialog μόνο όταν υπάρχουν suggestions.
   - Αν βρεθεί μόνο logo και όχι άλλα πεδία, σήμερα δεν θα ανοίξει σωστά το flow.

4. **Στα logs φαίνεται και quota issue του web-search fallback**
   - Υπάρχει `Perplexity error 401 insufficient_quota`.
   - Αυτό δεν εξηγεί το manual logo upload, αλλά επηρεάζει fallback enrichment ποιότητας.

## Σχέδιο διόρθωσης

### 1. Διόρθωση manual logo upload
Θα αλλάξω το upload path του client logo ώστε να είναι συμβατό με τις storage policies, π.χ. με user-scoped key μέσω του υπάρχοντος pattern `createProjectFilesObjectKey(...)` ή ισοδύναμο path που ξεκινά με το current user id.

### 2. Harden του AI logo pipeline
Στο `enrich-client` θα κάνω το logo resolution πιο αξιόπιστο και observable:
- καλύτερος fallback chain για logo/favicons
- validation ότι το fetched asset είναι όντως εικόνα
- σαφέστερο handling όταν το upload ή signed URL creation αποτυγχάνει
- explicit επιστροφή `logoUrl` όταν βρεθεί

### 3. Fix στο dialog opening logic
Θα ενημερώσω το `AIEnrichButton` ώστε να ανοίγει και όταν υπάρχει **μόνο** `logoUrl`, ακόμα κι αν `suggestions` είναι κενό array.

### 4. Καλύτερο UI feedback
Θα βελτιώσω το AI enrich UX ώστε:
- αν βρέθηκε μόνο logo, να εμφανίζεται κανονικά στο dialog
- αν το logo lookup αποτύχει, να δίνεται πιο σαφές μήνυμα αντί να μοιάζει σαν “δεν έκανε τίποτα”

### 5. Verification
Θα ελεγχθούν και τα 2 flows:
- χειροκίνητο ανέβασμα logo από το client header
- AI Enrich με website ώστε να εμφανίζεται το logo στο dialog και να αποθηκεύεται στον πελάτη

## Αρχεία που θα αλλάξουν
- `src/components/clients/detail/ClientSmartHeader.tsx`
- `src/components/clients/AIEnrichButton.tsx`
- `supabase/functions/enrich-client/index.ts`
- πιθανώς `src/utils/storageKeys.ts` μόνο αν χρειαστεί μικρό helper reuse

## Τεχνικές σημειώσεις
- Δεν χρειάζεται αλλαγή DB schema.
- Το κύριο bug του manual upload είναι **storage object key vs policy mismatch**.
- Το κύριο bug του AI enrich είναι ότι το backend **δεν επιστρέφει `logoUrl` στο τρέχον result**, άρα πρέπει να διορθωθεί στον enrichment pipeline και όχι μόνο στο UI.
