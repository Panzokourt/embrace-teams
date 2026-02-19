
# Αυτοματοποίηση Εγγραφής & Διαχείριση Join Requests

## Πώς θα λειτουργεί

### Ροή εγγραφής (αυτόματη)

```text
Νέος χρήστης εγγράφεται
       |
       v
  Είναι εταιρικό email; (όχι gmail/yahoo κλπ)
      / \
    Ναι  Όχι --> Onboarding (manual: create org ή invite)
     |
     v
  Υπάρχει εταιρεία με αυτό το domain;
      / \
    Ναι  Όχι --> Auto-create εταιρεία, χρήστης = Owner
     |
     v
  Auto-create Join Request
  --> Μήνυμα "Σε αναμονή έγκρισης"
```

### Στο HR: Tab "Αιτήματα Ένταξης"
- Εμφανίζει join_requests με status = pending
- Ο Admin/Owner μπορεί να Εγκρίνει (δημιουργεί user_company_roles με member) ή Απορρίψει
- Ειδοποίηση στο NotificationBell για νέα αιτήματα

---

## Τεχνικές Αλλαγές

### 1. Database: Νέα function `auto_onboard_user`
Νέα SQL function (security definer) που καλείται κατά το onboarding:
- Δέχεται user_id
- Ελέγχει domain του email
- Αν δεν υπάρχει εταιρεία: δημιουργεί εταιρεία + owner role
- Αν υπάρχει: δημιουργεί join_request
- Επιστρέφει jsonb με `action: 'created_company' | 'join_requested' | 'personal_email'`

### 2. Onboarding.tsx: Auto-trigger
- Κατά το mount, αν ο χρήστης δεν έχει εταιρεία, καλεί `auto_onboard_user`
- Αν `action = created_company`: redirect στο `/`
- Αν `action = join_requested`: δείχνει pending screen
- Αν `action = personal_email`: δείχνει τις manual επιλογές (όπως σήμερα)

### 3. HR Page: Ενότητα Join Requests
- Νέο component `JoinRequestsManager.tsx`
- Πίνακας με: Ονοματεπώνυμο, Email, Ημερομηνία αιτήματος, Status
- Κουμπιά: Έγκριση (insert user_company_roles + update status approved) / Απόρριψη (update status rejected)
- Εμφάνιση μόνο σε Admin/Owner
- Badge στο HR tab αν υπάρχουν pending requests

### 4. AuthContext update
- Μετά το login, αν δεν υπάρχουν company roles ΑΛΛΑ υπάρχει pending join_request, redirect σε pending screen αντί onboarding

### Αρχεία

| Αρχείο | Ενέργεια |
|--------|----------|
| Migration SQL | Νέα function `auto_onboard_user` |
| `src/pages/Onboarding.tsx` | Auto-trigger logic κατά mount |
| `src/contexts/AuthContext.tsx` | Check pending join requests |
| `src/components/hr/JoinRequestsManager.tsx` | Νέο - πίνακας αιτημάτων |
| `src/pages/HR.tsx` | Προσθήκη tab/section join requests |

### Ασφάλεια
- Η `auto_onboard_user` είναι security definer -- δεν χρειάζεται service role
- Τα join_requests έχουν ήδη RLS policies (users create own, admins view/manage)
- Η έγκριση γίνεται μόνο μέσω admin check στο component + RLS στη βάση
