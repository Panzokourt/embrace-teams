

# Setup Guide — Λειτουργικά Deep Links ανά Βήμα

## Πρόβλημα

Όλα τα βήματα στο Setup Guide popover πηγαίνουν στο `/onboarding` (full wizard). Αυτό δεν είναι χρήσιμο αφού ο χρήστης είναι ήδη μέσα στην εφαρμογή — πρέπει κάθε βήμα να οδηγεί στη σωστή σελίδα.

## Λύση

Κάθε step θα έχει ένα `route` property που οδηγεί στη σχετική σελίδα:

| Step | Route |
|------|-------|
| Εταιρεία | `/settings/organization` |
| Προφίλ | `/settings` |
| Ομάδα | `/hr?tab=staff` |
| Πελάτης | `/clients` |
| Έγγραφα | `/knowledge` |
| AI Setup | `/knowledge?tab=wiki` |

## Αλλαγές

### 1. `src/hooks/useOnboardingProgress.ts`
- Προσθήκη `route: string` στο `OnboardingStep` interface
- Κάθε step παίρνει το αντίστοιχο route

### 2. `src/components/onboarding/SetupGuide.tsx`
- Κάθε step button κάνει `navigate(step.route)` αντί για `navigate('/onboarding')`
- Το "Συνέχεια Setup" button βρίσκει τo πρώτο incomplete step και πηγαίνει εκεί
- Αφαιρείται η γενική αναφορά στο `/onboarding`

Δεν χρειάζεται δημιουργία νέων σελίδων — όλες υπάρχουν ήδη.

