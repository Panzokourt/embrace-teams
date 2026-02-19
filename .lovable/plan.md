

# Fix: Google Sign-up Onboarding Not Triggering

## Πρόβλημα

Μετά την εγγραφή με Google, ο χρήστης επιστρέφει στο `/` (Dashboard) αντί να περάσει από το `/onboarding`. Το `AppLayout` δεν ελέγχει αν ο χρήστης χρειάζεται onboarding, οπότε η `auto_onboard_user` δεν καλείται ποτέ.

## Λύση

Δύο αλλαγές:

### 1. AppLayout: Redirect σε onboarding αν δεν υπάρχει company role

Στο `AppLayout.tsx`, θα προστεθεί έλεγχος `postLoginRoute`. Αν ο χρήστης χρειάζεται onboarding ή workspace selection, θα γίνεται redirect αντί να δείχνει το Dashboard.

### 2. Fix info@advize.gr: Επαναφορά κατάστασης

Ο χρήστης `info@advize.gr` υπάρχει ήδη στη βάση χωρίς company role. Θα τρέξουμε SQL για να καθαρίσουμε την κατάσταση ώστε το onboarding να τρέξει σωστά στο επόμενο login.

---

## Τεχνικές Αλλαγές

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/components/layout/AppLayout.tsx` | Προσθήκη ελέγχου `postLoginRoute` -- αν είναι `/onboarding` ή `/select-workspace`, redirect εκεί αντί να δείξει το Dashboard |
| Database SQL | UPDATE profiles SET status = 'pending' WHERE email = 'info@advize.gr' (ώστε το auto_onboard να τρέξει σωστά) |

### Αλλαγή στο AppLayout.tsx

```typescript
export default function AppLayout() {
  const navigate = useNavigate();
  const { user, loading, isApproved, postLoginRoute } = useAuth();
  // ...

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    // Redirect to onboarding/workspace if needed
    if (!loading && user && postLoginRoute && postLoginRoute !== '/') {
      navigate(postLoginRoute, { replace: true });
    }
  }, [user, loading, navigate, postLoginRoute]);
```

Αυτό εξασφαλίζει ότι ακόμα και αν ο χρήστης επιστρέψει στο `/` μετά από Google OAuth, θα ανακατευθυνθεί στο `/onboarding` όπου θα τρέξει η `auto_onboard_user` αυτόματα.
