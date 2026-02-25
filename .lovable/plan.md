

# Διόρθωση Ροής Πρόσκλησης Χρήστη

## Πρόβλημα

Το email στέλνεται κανονικά (όπως φαίνεται στο screenshot), αλλά όταν ο χρήστης κάνει κλικ στο "Αποδοχή Πρόσκλησης", βλέπει "Access denied" γιατί:

1. Το link οδηγεί στο **preview URL** του Lovable (π.χ. `id-preview--xxx.lovable.app`) αντί στο **published URL** (`embrace-teams.lovable.app`)
2. Η edge function χρησιμοποιεί `supabase.auth.getClaims()` που δεν είναι διαθέσιμο στο Supabase JS v2 και μπορεί να σπάει σιωπηλά

## Λύση

### 1. Διόρθωση URL στο useRBAC.ts

Αντί να στέλνουμε `window.location.origin` (που στο preview είναι λάθος), θα χρησιμοποιούμε πάντα το published URL:

```text
app_url: 'https://embrace-teams.lovable.app'
```

Εναλλακτικά, θα χρησιμοποιήσουμε environment variable `VITE_APP_URL` αν υπάρχει, αλλιώς fallback στο published URL.

### 2. Διόρθωση auth verification στην Edge Function

Αντικατάσταση του `getClaims()` με `getUser()` που είναι η σωστή μέθοδος:

```text
// Αντί getClaims (δεν υπάρχει)
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) return 401
```

### 3. Βελτίωση error handling

Προσθήκη περισσότερων `console.log` στην edge function ώστε να μπορούμε να παρακολουθούμε τυχόν σφάλματα.

## Αρχεία

| Ενέργεια | Αρχείο |
|----------|--------|
| Τροποποίηση | `src/hooks/useRBAC.ts` -- Hardcode published URL |
| Τροποποίηση | `supabase/functions/send-invitation/index.ts` -- Fix auth + logging |

## Ροή μετά τη διόρθωση

```text
1. Admin στέλνει πρόσκληση
2. Edge function στέλνει email με link: embrace-teams.lovable.app/accept-invite/{token}
3. Χρήστης κάνει κλικ → ανοίγει το published app
4. Αν δεν είναι συνδεδεμένος → φόρμα login/register
5. Αν είναι ήδη συνδεδεμένος → αυτόματη αποδοχή
6. Μετά την αποδοχή → Welcome Wizard (/welcome)
7. Ολοκλήρωση wizard → Dashboard
```

