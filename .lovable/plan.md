

## Πραγματική αιτία (επιβεβαιωμένη)

Το published Olseny app (`app.olseny.com` και `olseny.lovable.app`) είναι **Private** στο επίπεδο Lovable hosting. Όταν κάποιος επισκέπτεται οποιοδήποτε URL — συμπεριλαμβανομένου του `/portal/access?token=...` — το Lovable edge τον στέλνει πρώτα στο `lovable.dev/auth-bridge` → `lovable.dev/login`, **πριν φορτώσει** η εφαρμογή React. Έτσι το `PortalAccess.tsx` και το `portal-token-exchange` δεν εκτελούνται ποτέ. Επιβεβαιώθηκε με fetch των URLs (όλα γυρίζουν το auth-bridge HTML) και με `get_publish_settings` → `effective_publish_visibility: "private"`.

Επομένως όλα τα fixes που κάναμε στο email/edge function/PIN είναι σωστά — απλώς ο πελάτης δεν έφτανε ποτέ στη σελίδα μας.

## Λύση: Ξεχωριστό public portal σε subdomain

Θα δημιουργήσουμε **ξεχωριστή παρουσία** του portal σε δικό του δημόσιο domain, ώστε το κύριο workspace να παραμένει private χωρίς να χαλάει η πρόσβαση των πελατών.

### Αρχιτεκτονική

```text
app.olseny.com         → Private workspace (όπως είναι τώρα)
                         μόνο μέλη της εταιρίας

portal.olseny.com      → Public portal (νέο deployment)
                         ίδιο codebase, ίδια DB, αλλά:
                         - ορατό σε όλους
                         - "guard" στο App.tsx που επιτρέπει
                           μόνο τα /portal/* routes
```

Το ίδιο codebase εξυπηρετεί και τα δύο. Με βάση το `window.location.hostname` το `App.tsx` επιλέγει τι να δείξει:

- σε `portal.olseny.com` → μόνο `/portal/*` routes· οποιοδήποτε άλλο path γίνεται redirect στο `/portal/access`.
- σε `app.olseny.com` → όλη η εφαρμογή όπως σήμερα.

Έτσι ο πελάτης που πατάει το magic link πέφτει σε **public** Lovable deployment, η σελίδα φορτώνει κανονικά, εκτελείται το token exchange και μπαίνει στο portal.

## Τι θα αλλάξω

### 1) Hosting / Domains (manual από εσένα μετά την υλοποίηση)

- Project Settings → Domains → **Add custom domain** `portal.olseny.com`.
- Αφού γίνει Active, θέλουμε **να αλλάξουμε το publish visibility σε `public`** (προτείνεται με `update_visibility` με τη συγκατάθεσή σου). Δεν υπάρχει per-domain visibility στο Lovable, άρα και τα δύο domains θα είναι public — γι' αυτό προστίθεται το hostname guard στον κώδικα (βλ. #2).
- Σημείωση: το `app.olseny.com` δεν θα είναι πια "Private" στο Lovable επίπεδο, αλλά το guard στο App.tsx θα κρατά τη συμπεριφορά (όλα τα routes εκτός `/portal/*` θα απαιτούν login μέσω του υπάρχοντος `AppLayout` → `Navigate to="/auth"`). Καμία αλλαγή στην εμπειρία του staff.

### 2) Hostname guard στο App.tsx

- Νέο helper `isPortalHost()` που κοιτάει `window.location.hostname` και επιστρέφει `true` για `portal.olseny.com` (ρυθμιζόμενο με Vite env `VITE_PORTAL_HOSTNAMES`, default `portal.olseny.com`).
- Στο `App.tsx`, αν `isPortalHost()`:
  - Render μόνο τα portal routes:
    - `/portal/access` → `PortalAccess`
    - `/portal/*` → `ClientPortalLayout` με τα 4 children
    - `*` → `<Navigate to="/portal/access" replace />`
- Αν όχι portal host → render τα κανονικά routes όπως τώρα.

### 3) Email link → νέο domain

- Στο `invite-portal-user/index.ts` αλλάζω `baseUrl` από `https://app.olseny.com` σε `https://portal.olseny.com` (configurable μέσω env `PORTAL_PUBLIC_URL`, fallback `https://portal.olseny.com`).
- Το `accessUrl` γίνεται `https://portal.olseny.com/portal/access?token=...`.
- Re-deploy της edge function.

### 4) ClientPortalLayout signOut

- Αυτή τη στιγμή το `signOut()` καλεί `supabase.auth.signOut()` και το `App.tsx` (στο portal host) θα κάνει redirect στο `/portal/access` αυτόματα μέσω του fallback. Καμία επιπλέον αλλαγή.

### 5) Re-deploy `portal-token-exchange`

- Δεν αλλάζει η λογική του, μόνο επιβεβαιώνεται ότι είναι deployed (το έχουμε ήδη). Επειδή έχει `verify_jwt = false`, καλείται κανονικά από το public portal host.

## Verification (αφού ολοκληρώσουμε)

- Connect `portal.olseny.com` → DNS Active.
- Switch publish visibility σε public.
- Νέα πρόσκληση πελάτη με PIN → email φτάνει με link `https://portal.olseny.com/portal/access?token=...`.
- Άνοιγμα σε ιδιωτικό παράθυρο (χωρίς cookies) → φορτώνει η σελίδα PortalAccess (όχι Lovable login).
- Με PIN → είσοδος → `/portal` (Επισκόπηση).
- Έλεγχος: `https://portal.olseny.com/` → redirect σε `/portal/access`.
- Έλεγχος: `https://portal.olseny.com/work` → redirect σε `/portal/access` (δεν εκτίθεται το staff app).
- Έλεγχος: `https://app.olseny.com/work` → δουλεύει όπως πριν για το staff (μέσω login).

## Αρχεία που θα αλλάξουν

- `src/App.tsx` (νέος hostname guard, εναλλακτικό route tree για portal host)
- `src/lib/portalHost.ts` **(νέο)** — `isPortalHost()` helper + env reading
- `supabase/functions/invite-portal-user/index.ts` (αλλαγή `baseUrl` → `portal.olseny.com`)
- (Re-deploy) `supabase/functions/portal-token-exchange/index.ts` — χωρίς αλλαγή κώδικα

## Τι θα χρειαστώ από εσένα

1. Έγκριση να αλλάξω το publish visibility σε **public** (πρέπει να γίνει για να φεύγει το auth-bridge).
2. Μετά το deploy: να συνδέσεις στο Project Settings → Domains το `portal.olseny.com` και να περιμένεις να γίνει Active. Όταν ολοκληρωθεί, στέλνεις δοκιμαστική πρόσκληση και επιβεβαιώνουμε.

## Τεχνικές σημειώσεις

- Δεν αγγίζουμε Supabase Auth settings (site URL, redirect URLs).
- Δεν αλλάζει το DB schema — μόνο frontend routing & ένα URL string στο edge function.
- Backwards compat: παλιά tokens συνεχίζουν να λειτουργούν, αρκεί ο πελάτης να ανοίξει το νέο link (ή να ζητηθεί επαναποστολή για να πάρει `portal.olseny.com` URL).

