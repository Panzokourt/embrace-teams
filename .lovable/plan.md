

# Προστασία Platform Admin — Re-authentication & Hardening

## Τρέχουσα κατάσταση
Η σελίδα `/platform-admin` ελέγχει `isPlatformAdmin` από το AuthContext και κάνει redirect αν δεν είσαι admin. Το edge function επίσης ελέγχει JWT + `is_platform_admin()`. **Αυτό είναι καλό, αλλά δεν αρκεί** — αν κάποιος έχει πρόσβαση στο browser ενός admin (open session), μπαίνει χωρίς πρόσθετο έλεγχο.

## Τι θα προστεθεί

### 1. Re-authentication Gate (PIN/Password)
Πριν εμφανιστεί το dashboard, ο admin πρέπει να εισάγει τον κωδικό του ξανά. Αυτό ακολουθεί ISO 27001 A.9.4.2 (secure log-on procedures) και NIST SP 800-63B (re-authentication for sensitive operations).

- Dialog με password input κατά την είσοδο στη σελίδα
- Verification μέσω `supabase.auth.signInWithPassword()` (re-auth με τα ίδια credentials)
- Session timeout: η re-auth ισχύει για 15 λεπτά (sessionStorage), μετά ζητάει ξανά
- Μετά από 3 αποτυχημένες προσπάθειες → lockout 60 δευτερόλεπτα

### 2. Audit Logging στο Edge Function
Κάθε πρόσβαση στο platform admin (GET/POST) καταγράφεται σε νέο πίνακα `platform_admin_audit_log`:
- `admin_user_id`, `action`, `target_user_id`, `ip_address`, `user_agent`, `created_at`
- Ακολουθεί ISO 27001 A.12.4 (logging and monitoring)

### 3. Rate Limiting στο Edge Function
- Max 30 requests ανά λεπτό ανά admin (in-memory Map)
- Αποτρέπει automated abuse ακόμα κι αν κάποιος αποκτήσει πρόσβαση

### 4. Security Headers
Προσθήκη security headers στο edge function response:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Cache-Control: no-store` (ευαίσθητα δεδομένα δεν αποθηκεύονται σε cache)

## Database Migration
```sql
CREATE TABLE public.platform_admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.platform_admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins can read audit log"
  ON public.platform_admin_audit_log FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));
```

## Αρχεία

| Αρχείο | Αλλαγή |
|--------|--------|
| Migration SQL | Πίνακας `platform_admin_audit_log` |
| `src/pages/PlatformAdmin.tsx` | Re-auth gate (password dialog), session timeout 15min, lockout μετά 3 αποτυχίες |
| `supabase/functions/platform-admin-data/index.ts` | Audit logging, rate limiting, security headers |

