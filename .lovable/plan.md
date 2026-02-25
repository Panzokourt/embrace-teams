
# Διόρθωση Συστήματος Χρηστών & Πρόσκλησης

## Τι βρήκα στη βάση δεδομένων

Ερεύνησα τα δεδομένα και εντόπισα τα εξής:

1. **Ο χρήστης test@gmail.gr δεν χρησιμοποίησε τo link πρόσκλησης** -- αντί αυτού, έκανε απευθείας εγγραφή στη σελίδα Auth. Μετά την εγγραφή, το σύστημα onboarding είδε το domain `gmail.gr` και **δεν το αναγνώρισε ως personal email** (η λίστα περιέχει μόνο `gmail.com`, όχι `gmail.gr`). Έτσι, δημιούργησε αυτόματα μια νέα εταιρεία "Gmail" με domain `gmail.gr`.

2. **Οι προσκλήσεις στάλθηκαν από τη "Default Company"** (00000000...) αντί από την "Advize" -- Φαίνεται ότι δουλεύατε στο context της Default Company (αυτή που δημιουργήθηκε με τα demo δεδομένα) αντί για την Advize.

3. **Όλες οι προσκλήσεις στο panzokourt@gmail.com είναι cancelled** -- καμία δεν έγινε αποδεκτή.

4. **Ο χρήστης test@gmail.gr βλέπει ξεχωριστό περιβάλλον** γιατί είναι Owner σε νέα εταιρεία "Gmail", χωρίς σχέση με τα δικά σας δεδομένα.

## Λύσεις

### 1. Επέκταση λίστας personal email domains

Η `auto_onboard_user` θα αναγνωρίζει σωστά τα ελληνικά και διεθνή personal domains:

Προσθήκη: `gmail.gr`, `yahoo.gr`, `hotmail.gr`, `outlook.gr`, `windowslive.com`, `yandex.com`, `me.com`, `msn.com`, `inbox.com`, `gmx.com`, `gmx.de` κ.α.

### 2. Auto-accept πρόσκλησης κατά την εγγραφή

Το κρισιμότερο: Η `auto_onboard_user` θα ελέγχει **πρώτα** αν υπάρχει εκκρεμής πρόσκληση για το email του χρήστη. Αν ναι, θα την αποδέχεται αυτόματα αντί να δημιουργεί νέα εταιρεία.

```text
Σειρά ελέγχων:
1. Υπάρχει pending invitation; -> Auto-accept -> "invitation_accepted"
2. Ήδη μέλος εταιρείας; -> "already_member"
3. Personal email; -> "personal_email" (εμφάνιση επιλογών)
4. Corporate email + εταιρεία υπάρχει; -> Join request
5. Corporate email + δεν υπάρχει; -> Δημιουργία εταιρείας
```

### 3. Έλεγχος πρόσκλησης στο AuthContext

Μετά τη σύνδεση, αν ο χρήστης δεν έχει ρόλο αλλά υπάρχει pending invitation, θα τον ρουτάρει στο `/accept-invite` αυτόματα.

### 4. Καθαρισμός βάσης

Αφαίρεση της "Gmail" εταιρείας (ddb40b7c) και του role του test@gmail.gr εκεί. Αν θέλετε τον χρήστη στην Advize ή στη Default Company, μπορείτε να τον προσκαλέσετε ξανά μετά τη διόρθωση.

### 5. Διόρθωση routing μετά εγγραφή

Μετά από email/password signup (μη-Google), ο χρήστης θα ανακατευθύνεται σωστά στο `/onboarding` χάρη στο fix του AuthContext -- αλλά πλέον το onboarding θα ελέγχει πρώτα τις προσκλήσεις.

---

## Τεχνικές Λεπτομέρειες

### Migration SQL

1. Ενημέρωση `auto_onboard_user` function:
   - Προσθήκη ελέγχου pending invitations πριν από οτιδήποτε άλλο
   - Επέκταση personal domains array
   - Αν βρεθεί invitation: auto-accept (δημιουργία role, ενημέρωση invitation status)

2. Cleanup:
   - Διαγραφή εταιρείας "Gmail" (ddb40b7c)
   - Διαγραφή role test@gmail.gr σε "Gmail"

### Αρχεία

| Ενέργεια | Αρχείο |
|----------|--------|
| Migration | Ενημέρωση `auto_onboard_user` + cleanup data |
| Τροποποίηση | `src/contexts/AuthContext.tsx` -- Έλεγχος pending invitation στο fetchUserData |
| Τροποποίηση | `src/pages/Onboarding.tsx` -- Προσθήκη personal domain list sync |
| Τροποποίηση | `src/pages/Auth.tsx` -- Σωστό redirect μετά signup |

### Ροή μετά τη διόρθωση

```text
Σενάριο 1: Χρήστης κάνει κλικ στο link πρόσκλησης
  -> AcceptInvite page -> login/register -> accept_invitation RPC -> Welcome Wizard

Σενάριο 2: Χρήστης κάνει απευθείας εγγραφή (χωρίς link)
  -> Auth page -> signup -> auto-confirm -> fetchUserData
  -> Onboarding -> auto_onboard_user ελέγχει πρώτα invitations
  -> Αν υπάρχει invitation: auto-accept -> Welcome Wizard
  -> Αν όχι: κανονική ροή (create org / domain join)

Σενάριο 3: Google OAuth
  -> Auth page -> Google -> redirect /onboarding -> ίδια ροή με Σενάριο 2
```
