

# Fix Onboarding Skip Bug + Persistent Setup Guide

## Bug Analysis

**Root cause**: Στο `OnboardingCompany.handleCreateCompany`, μετά τη δημιουργία εταιρείας καλείται `refreshUserData()` → αυτό θέτει `companyRole` στο AuthContext → ενεργοποιείται το `useEffect` στο Onboarding.tsx (γραμμή 54-58) που κάνει redirect στο `/` αν υπάρχει `companyRole`. Αποτέλεσμα: ο χρήστης φεύγει από το wizard αμέσως μετά το βήμα 2.

## Fix 1: Onboarding redirect guard

Στο `Onboarding.tsx`, αλλάζω το useEffect ώστε **να μην κάνει redirect αν το onboarding δεν έχει ολοκληρωθεί** (`onboarding_completed === false`). Αν ο χρήστης έχει company role ΑΛΛΑ δεν έχει τελειώσει onboarding, παραμένει στο wizard.

```typescript
useEffect(() => {
  if (companyRole && profile?.onboarding_completed) {
    navigate('/', { replace: true });
  }
}, [companyRole, profile, navigate]);
```

## Fix 2: Persistent Setup Guide (Onboarding Checklist)

Νέο component `SetupGuide` που εμφανίζεται μέσα στην εφαρμογή (στο TopBar ή ως floating widget) και δείχνει στον χρήστη τα βήματα onboarding και ποια έχει ολοκληρώσει.

### Λειτουργικότητα
- Εμφανίζεται **μόνο αν `onboarding_completed === false`** (ή αν ο χρήστης το ανοίξει χειροκίνητα)
- Checklist items: Company ✓, Profile, Team, Client, Docs, AI Setup
- Κάθε item ελέγχεται δυναμικά (π.χ. "Profile" = has phone or job_title, "Team" = has invited members, "Client" = has at least 1 client)
- Click σε ημιτελές βήμα → ανοίγει modal/drawer με τη φόρμα αντίστοιχου βήματος
- Progress ring στο TopBar δείχνει ποσοστό ολοκλήρωσης
- Κουμπί "Ολοκλήρωση Setup" κάνει mark onboarding_completed = true

### Θέση στο UI
- Νέο icon button στο TopBar (δίπλα στο XP Badge) με progress indicator
- Popover/Drawer με τη λίστα βημάτων
- Badge notification αν υπάρχουν εκκρεμή βήματα

## Files

| File | Αλλαγή |
|------|--------|
| `src/pages/Onboarding.tsx` | Fix redirect guard — check `onboarding_completed` πριν redirect |
| `src/hooks/useOnboardingProgress.ts` | Νέο — hook που ελέγχει ποια βήματα ολοκληρώθηκαν (queries profiles, clients, invitations κλπ) |
| `src/components/onboarding/SetupGuide.tsx` | Νέο — checklist popover με progress ring |
| `src/components/layout/TopBar.tsx` | Προσθήκη SetupGuide button/icon όταν onboarding incomplete |

