

## Πρόβλημα

Όταν ο πελάτης πατάει το κουμπί "Είσοδος στο Portal" στο email, καταλήγει στο **Lovable login** (`lovable.dev/login?...`) αντί για την σελίδα του Olseny portal. Επίσης ζητάς να μην είναι "ανοιχτό" το portal — να μπαίνει με κωδικό.

## Αιτία

1. Το `adminClient.auth.admin.generateLink({ type: 'magiclink' })` παράγει link που δείχνει στο default Supabase auth callback. Επειδή το Lovable Cloud project έχει ως site URL το `lovable.dev`, η ανακατεύθυνση περνάει πρώτα από το Lovable bridge → εμφανίζεται το Lovable login.
2. Το `redirectTo: portalUrl` (`https://app.olseny.com/portal`) δεν υπάρχει στη λίστα των allowed redirect URLs του auth, οπότε γίνεται fallback στο default site URL (Lovable).
3. Δεν υπάρχει "πύλη" στο `/portal` — το ClientPortalLayout κοιτάει μόνο `useAuth().user`, όχι portal-specific session.

## Λύση: Custom magic link μέσω Olseny domain (όχι Supabase auth flow)

Αντί για Supabase magic link, θα χρησιμοποιήσουμε **δικό μας token-based access** που λειτουργεί 100% στο `app.olseny.com` και δεν περνάει από Lovable.

### Νέο σύστημα prosvash

**Δύο τρόποι εισόδου** (επιλογή του admin που στέλνει την πρόσκληση):

**A) Magic link (default)** — One-click, χωρίς κωδικό
- Στέλνεται email με link: `https://app.olseny.com/portal/access?token=<random-token>`
- Το token ζει 30 ημέρες και κάνει automatic sign-in στο portal

**B) Magic link + PIN** — Επιπλέον προστασία
- Στέλνεται link + 6-digit PIN στο email
- Στο `/portal/access` ζητείται το PIN πριν την είσοδο
- Το PIN επανα-χρησιμοποιείται για όλες τις μελλοντικές εισόδους (σαν "password" του portal)

## Τι θα αλλάξω

### 1. DB Migration

Νέος πίνακας `client_portal_access_tokens`:
```text
id              uuid pk
client_id       uuid fk → clients
company_id      uuid fk → companies
email           text
user_id         uuid fk → auth.users (nullable, set on first use)
token_hash      text   (sha256 of the URL token)
pin_hash        text   (nullable, sha256 of PIN if "require_pin")
require_pin     boolean default false
expires_at      timestamptz
last_used_at    timestamptz
created_by      uuid
created_at      timestamptz
```

RLS: read μόνο μέσω SECURITY DEFINER function. Insert/manage μόνο σε admins της εταιρίας.

Νέα RPC functions:
- `portal_validate_token(token text, pin text default null) returns jsonb` — επιστρέφει `{ valid, client_id, company_id, requires_pin, user_id }`
- `portal_consume_token(token text, pin text default null) returns jsonb` — δημιουργεί session-ready response, log τη χρήση

### 2. Edge function refactor: `invite-portal-user`

- Παύει να καλεί `inviteUserByEmail` / `generateLink` (αυτά παράγουν Lovable links)
- Αντί γι' αυτό:
  1. Δημιουργεί έναν auth user **passwordless** ή reuse υπάρχοντα (όπως τώρα)
  2. Δημιουργεί entry στο `client_portal_users`
  3. Δημιουργεί entry στο `client_portal_access_tokens` με random 32-byte token (+ optional PIN αν `require_pin=true`)
  4. Στέλνει Resend email με link: `https://app.olseny.com/portal/access?token=...` και (αν PIN) εμφανίζει το PIN
- Νέο body parameter: `require_pin: boolean` (default false)

### 3. Νέα edge function: `portal-token-exchange`

Public function (no JWT). Δέχεται `{ token, pin? }`:
- Καλεί `portal_validate_token`
- Αν valid: χρησιμοποιεί service role για να κάνει `adminClient.auth.admin.generateLink` με τύπο `magiclink` **αλλά μόνο για επιστροφή access/refresh tokens** μέσω `signInWithIdToken`-style flow
- Επιστρέφει `{ access_token, refresh_token }` που το client βάζει σε `supabase.auth.setSession`

Αυτό κρατάει την επικύρωση 100% στο δικό μας domain — ποτέ δεν περνάει από Lovable.

### 4. Νέα route: `/portal/access`

Νέο component `PortalAccess.tsx`:
- Διαβάζει `?token=` από URL
- Αν το token απαιτεί PIN, δείχνει input για 6-digit PIN
- Καλεί την `portal-token-exchange` edge function
- Με τα tokens κάνει `supabase.auth.setSession(...)` και redirect σε `/portal`
- UI: full-screen Olseny-branded με logo, "Καλωσήρθατε στο Portal {clientName}"

### 5. Update `PortalUserManager.tsx`

Στο dialog πρόσκλησης:
- Νέο checkbox: **"Απαιτείται PIN για είσοδο"** (default off)
- Αν checked: σύντομη εξήγηση ότι θα σταλεί 6-digit PIN στο email
- Νέο κουμπί δίπλα σε κάθε portal user: **"Επαναποστολή πρόσκλησης"** (refresh token + send new email)

### 6. Update `ClientPortalLayout.tsx`

Καμία αλλαγή στο logic — η session ήδη έχει σετ μέσω setSession από το `/portal/access`. Απλώς guard: αν δεν υπάρχει `client_portal_users` entry, redirect σε `/portal/access?error=no_access` αντί για `/auth`.

### 7. Email template update

Δύο variants:
- `PortalInvitationEmail` (no PIN): ίδιο όπως τώρα, αλλά με νέο `acceptUrl` που δείχνει στο `app.olseny.com/portal/access?token=...`
- `PortalInvitationEmailWithPin`: ίδιο layout + ένα styled box με το 6-digit PIN

## Verification

- Νέα πρόσκληση χωρίς PIN → email με Olseny link → click → auto sign-in → portal
- Νέα πρόσκληση με PIN → email με link + PIN → click → PIN screen → input → portal
- Λάθος PIN → error message, καμία είσοδος
- Λήξη token (>30 ημέρες) → friendly error στη `/portal/access`
- Επαναποστολή πρόσκλησης → νέο token, παλιό token invalidates
- Δεν εμφανίζεται ποτέ το Lovable login

## Αρχεία που θα αλλάξουν

**DB Migration (νέο):**
- table `client_portal_access_tokens`
- functions `portal_validate_token`, `portal_consume_token`, `portal_create_token`
- RLS policies

**Edge functions:**
- `supabase/functions/invite-portal-user/index.ts` (refactor: αφαίρεση generateLink, χρήση custom token)
- `supabase/functions/portal-token-exchange/index.ts` (νέο)
- `supabase/functions/invite-portal-user/_templates/portal-invitation.tsx` (variant με PIN box)

**Frontend:**
- `src/pages/portal/PortalAccess.tsx` (νέο)
- `src/App.tsx` (route `/portal/access`)
- `src/components/portal/PortalUserManager.tsx` (PIN toggle + resend button)
- `src/components/portal/ClientPortalLayout.tsx` (redirect target update)

## Τεχνικές σημειώσεις

- Δεν αλλάζουν Supabase Auth settings — δεν χρειάζεται να προστεθεί κάτι στα allowed redirect URLs.
- Το token είναι 32-byte random base64url, hashed (sha256) στη DB.
- Το PIN είναι 6 ψηφία, hashed (bcrypt-style μέσω pgcrypto `crypt`).
- Rate limiting στο `portal-token-exchange`: max 5 PIN attempts ανά 15 λεπτά ανά token.
- Backwards compatible: υπάρχοντες portal users συνεχίζουν να λειτουργούν αν είναι ήδη logged in.

