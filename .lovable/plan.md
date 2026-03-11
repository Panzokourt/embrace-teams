

# Στάδια ασφαλείας στην Εγγραφή & Σύνδεση

## Τι θα προστεθεί

### 1. Confirm Password (Εγγραφή)
Νέο πεδίο "Επιβεβαίωση κωδικού" στη φόρμα εγγραφής. Validation μέσω zod `.refine()` ότι ταιριάζουν.

### 2. Password Strength Indicator (Εγγραφή)
Visual bar κάτω από το πεδίο κωδικού με 4 κριτήρια:
- 8+ χαρακτήρες
- Τουλάχιστον 1 κεφαλαίο
- Τουλάχιστον 1 αριθμός
- Τουλάχιστον 1 ειδικός χαρακτήρας (!@#$%...)

Χρώμα bar: κόκκινο → πορτοκαλί → κίτρινο → πράσινο. Minimum requirement: 3/4 κριτήρια για να επιτραπεί η εγγραφή.

### 3. Forgot Password & Reset Password Flow
- **Στη σελίδα σύνδεσης**: Link "Ξεχάσατε τον κωδικό;" → εμφανίζει inline φόρμα με email input + κουμπί αποστολής
- **Νέα σελίδα `/reset-password`**: Φόρμα νέου κωδικού + confirm, ελέγχει `type=recovery` στο URL hash, καλεί `supabase.auth.updateUser({ password })`
- Route registration στο `App.tsx`

### 4. Client-side Rate Limiting (Σύνδεση)
Μετρητής αποτυχημένων προσπαθειών. Μετά από 5 αποτυχίες → cooldown 30 δευτερολέπτων με countdown timer. Αποθήκευση σε state (χάνεται με refresh — δεν είναι real security, αλλά αποτρέπει casual brute-force).

### 5. Terms & Privacy Checkbox (Εγγραφή)
Checkbox "Αποδέχομαι τους Όρους Χρήσης και την Πολιτική Απορρήτου" — required πριν την υποβολή. Placeholder links (μπορούν να ρυθμιστούν αργότερα).

## Αρχεία

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/pages/Auth.tsx` | Confirm password, strength bar, rate limiting, terms checkbox, forgot password inline |
| `src/pages/ResetPassword.tsx` | Νέα σελίδα για reset password |
| `src/App.tsx` | Route `/reset-password` |

