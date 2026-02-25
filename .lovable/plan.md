

# Ολοκληρωμένο Σύστημα Πρόσκλησης & Onboarding Χρηστών

## Πρόβλημα Σήμερα

1. Όταν ένας admin στέλνει πρόσκληση, αποθηκεύεται μόνο στη βάση -- **δεν αποστέλλεται email**.
2. Ο προσκεκλημένος χρήστης πρέπει να γνωρίζει ένα UUID token και να το κάνει paste χειροκίνητα -- πρακτικά αδύνατο.
3. Δεν υπάρχει welcome wizard για νέους χρήστες που μπαίνουν σε υπάρχοντα οργανισμό.
4. Δεν υπάρχει ενοποιημένη ροή για τις διαφορετικές περιπτώσεις (πρόσκληση, join request, freelancer, κλπ).

## Λύση

### 1. Edge Function για αποστολή Invitation Email

**Νέο αρχείο: `supabase/functions/send-invitation/index.ts`**

Θα δημιουργηθεί backend function που:
- Καλείται αυτόματα μετά τη δημιουργία πρόσκλησης
- Στέλνει email στον προσκεκλημένο με ένα magic link (π.χ. `https://app.olseny.com/accept-invite/{token}`)
- Χρησιμοποιεί Resend για αποστολή email
- Περιλαμβάνει branded React Email template με το λογότυπο Olseny

**Απαίτηση**: Θα χρειαστεί RESEND_API_KEY (API κλειδί από το resend.com) και ένα verified domain.

### 2. Αυτόματη αποστολή email μετά τη δημιουργία πρόσκλησης

**Τροποποίηση: `src/hooks/useRBAC.ts`**

Μετά το `createInvitation`, καλεί αυτόματα τη νέα edge function για αποστολή email με:
- Όνομα εταιρείας
- Ρόλο που θα αποκτήσει ο χρήστης
- Magic link για αποδοχή

### 3. Βελτίωση ροής AcceptInvite

**Τροποποίηση: `src/pages/AcceptInvite.tsx`**

Ο χρήστης κάνει κλικ στο link του email και:
- **Αν έχει ήδη λογαριασμό**: Ζητά σύνδεση, μετά αποδέχεται αυτόματα
- **Αν δεν έχει λογαριασμό**: Εμφανίζεται inline φόρμα εγγραφής (ονοματεπώνυμο + κωδικός), με το email προ-συμπληρωμένο από την πρόσκληση. Μετά την εγγραφή, αποδέχεται αυτόματα.
- Αφαίρεση χειροκίνητης εισαγωγής UUID token

### 4. Welcome Wizard για νέους χρήστες σε υπάρχοντα οργανισμό

**Νέο αρχείο: `src/pages/WelcomeWizard.tsx`**

Εμφανίζεται μόνο σε χρήστες που μπαίνουν σε οργανισμό για πρώτη φορά (μέσω πρόσκλησης ή join request). Βήματα:

1. **Καλωσόρισμα** -- "Καλωσήρθατε στο [Εταιρεία]!" με λογότυπο εταιρείας
2. **Προφίλ** -- Avatar upload, τηλέφωνο, τίτλος θέσης
3. **Προτιμήσεις** -- Γλώσσα, θέμα (dark/light), ειδοποιήσεις
4. **Ξεκινήστε** -- Σύνοψη + κουμπί "Μπείτε στον χώρο εργασίας"

Η πρόοδος αποθηκεύεται στο profile (`onboarding_completed` flag).

### 5. Αναδιοργάνωση Onboarding Page

**Τροποποίηση: `src/pages/Onboarding.tsx`**

Καθαρότερη ροή:
- Αφαίρεση του βήματος "Αποδοχή πρόσκλησης" (γίνεται πλέον μέσω email link)
- Αν ο χρήστης έχει personal email: εμφανίζονται 2 επιλογές (Δημιουργία εταιρείας ή Freelancer mode)
- Αν έχει corporate email: auto-onboard (ήδη λειτουργεί)

### 6. Routing Logic

**Τροποποίηση: `src/contexts/AuthContext.tsx`**

Μετά τη σύνδεση:
- Νέος χρήστης χωρίς ρόλο → `/onboarding`
- Νέος χρήστης μέσω πρόσκλησης (πρώτη φορά) → `/welcome` (wizard)
- Υπάρχων χρήστης, 1 εταιρεία → `/`
- Υπάρχων χρήστης, πολλές εταιρείες → `/select-workspace`

---

## Τεχνικές Λεπτομέρειες

### Database Changes

Προσθήκη στον πίνακα `profiles`:
- `onboarding_completed boolean DEFAULT false` -- flag για το αν ολοκλήρωσε το welcome wizard

### Email Template

Branded React Email template (`supabase/functions/send-invitation/_templates/invitation.tsx`) με:
- Λογότυπο Olseny
- Όνομα εταιρείας που προσκαλεί
- Ρόλος χρήστη
- CTA button "Αποδοχή Πρόσκλησης"
- Ημερομηνία λήξης

### Αρχεία

| Ενέργεια | Αρχείο |
|----------|--------|
| Δημιουργία | `supabase/functions/send-invitation/index.ts` |
| Δημιουργία | `supabase/functions/send-invitation/_templates/invitation.tsx` |
| Δημιουργία | `src/pages/WelcomeWizard.tsx` |
| Τροποποίηση | `src/pages/AcceptInvite.tsx` |
| Τροποποίηση | `src/pages/Onboarding.tsx` |
| Τροποποίηση | `src/hooks/useRBAC.ts` |
| Τροποποίηση | `src/contexts/AuthContext.tsx` |
| Τροποποίηση | `src/App.tsx` (νέο route `/welcome`) |
| Migration | Προσθήκη `onboarding_completed` στο profiles |

### Προαπαιτούμενα

Για την αποστολή email θα χρειαστεί:
1. Λογαριασμός στο **resend.com**
2. Verified domain (ή χρήση του test domain `onboarding@resend.dev`)
3. Δημιουργία API key και αποθήκευσή του ως `RESEND_API_KEY`

