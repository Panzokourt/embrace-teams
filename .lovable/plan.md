

# Platform Admin Panel — `/platform-admin`

## Σκοπός
Μια ξεχωριστή σελίδα αποκλειστικά για τον δημιουργό/ιδιοκτήτη της πλατφόρμας, που επιτρέπει cross-tenant διαχείριση χωρίς να ανήκει σε κάθε εταιρεία.

## Ασφάλεια
- Νέος πίνακας `platform_admins` με στήλη `email` (whitelisted emails, π.χ. `koupant@gmail.com`)
- Νέα `security definer` function `is_platform_admin(uuid)` που ελέγχει αν το email του χρήστη υπάρχει στο `platform_admins`
- RLS policies: μόνο platform admins μπορούν να διαβάσουν cross-tenant data
- Στο frontend: guard στο route — αν δεν είσαι platform admin, redirect

## Database Migration
```sql
-- Platform admins table
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Seed the creator
INSERT INTO public.platform_admins (email) VALUES ('koupant@gmail.com');

-- Security definer function
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins pa
    JOIN auth.users u ON u.email = pa.email
    WHERE u.id = _user_id
  )
$$;

-- RLS: only platform admins can read
CREATE POLICY "Platform admins can read" ON public.platform_admins
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));
```

## UI — Σελίδα `/platform-admin`
Tabs:
1. **Χρήστες** — Λίστα ΟΛΩΝ των χρηστών (cross-company) με search, email, status, ημερομηνία εγγραφής. Actions: suspend/activate.
2. **Εταιρείες** — Λίστα ΟΛΩΝ των companies με μέλη, domain, ημερομηνία δημιουργίας.
3. **Στατιστικά** — Σύνολο χρηστών, σύνολο εταιρειών, εγγραφές τελευταίου μήνα, active users.

## Edge Function — `platform-admin-data`
Ένα edge function που δέχεται JWT, ελέγχει `is_platform_admin`, και επιστρέφει data χρησιμοποιώντας service role key (bypass RLS):
- `GET ?type=users` → all profiles + company roles
- `GET ?type=companies` → all companies + member counts
- `GET ?type=stats` → aggregate stats
- `POST ?action=suspend&userId=...` → suspend user
- `POST ?action=activate&userId=...` → activate user

## Αρχεία

| Αρχείο | Αλλαγή |
|--------|--------|
| Migration SQL | Πίνακας `platform_admins`, function `is_platform_admin` |
| `supabase/functions/platform-admin-data/index.ts` | Edge function για cross-tenant queries |
| `src/pages/PlatformAdmin.tsx` | Νέα σελίδα με 3 tabs |
| `src/App.tsx` | Route `/platform-admin` (εκτός AppLayout) |
| `src/contexts/AuthContext.tsx` | Προσθήκη `isPlatformAdmin` flag |

