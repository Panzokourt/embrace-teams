## Στόχος

Να μπορεί ο χρήστης να συνδέσει email account και με manual IMAP/SMTP (όχι μόνο Gmail OAuth) — π.χ. εταιρικά mailboxes, cPanel, Outlook on-prem, Yahoo App Password κ.λπ.

## Τρέχουσα κατάσταση

- Ο πίνακας `email_accounts` ήδη έχει τα πεδία IMAP/SMTP (`imap_host/port`, `smtp_host/port`, `username`, `use_tls`) και υπάρχει το hook `useEmailAccount` με presets (Gmail/Outlook/Yahoo).
- Όμως το UI Settings δείχνει μόνο το `EmailAccountSetup` (Gmail OAuth μέσω `useGmailAccount` + `gmail-auth-start/callback` + `email-fetch/send`).
- Δεν υπάρχει αποθήκευση password ούτε edge function που να μιλάει IMAP/SMTP.

## Σχέδιο

### 1. Database (migration)
- Νέος πίνακας `email_account_credentials` (ξεχωριστά από `email_accounts` για security):
  - `account_id` (FK), `encrypted_password` (text), `created_at`, `updated_at`.
  - RLS: μόνο ο owner του account μπορεί να βλέπει/γράφει. Service role full access.
  - Το password κρυπτογραφείται με `pgsosp`/`pgcrypto` χρησιμοποιώντας secret από Vault (`EMAIL_CREDENTIALS_KEY`).
- Προσθήκη `provider_type` στο `email_accounts` ('gmail_oauth' | 'imap_smtp') για να ξεχωρίζουμε τα δύο.

### 2. Νέα Edge Functions
- `email-imap-test` — δέχεται credentials, κάνει IMAP login + SMTP verify, επιστρέφει success/error. Χρησιμοποιείται και πριν την αποθήκευση.
- `email-imap-fetch` — fetch latest N messages από IMAP INBOX, parse, αποθήκευση στον υπάρχοντα πίνακα `emails` (ίδιο schema με Gmail flow).
- `email-imap-send` — αποστολή μέσω SMTP, με ίδιο contract με `email-send`.
- Library: `npm:imapflow` για IMAP, `npm:nodemailer` για SMTP (τρέχουν σε Deno edge).

### 3. UI — νέα ενότητα στο Settings → Email/Inbox
Refactor του `EmailAccountSetup.tsx`:
- Tabs ή radio: **Gmail (OAuth)** | **Manual (IMAP/SMTP)**.
- Manual form με πεδία: email, display name, IMAP host/port, SMTP host/port, username, password, TLS toggle, provider preset dropdown (Gmail/Outlook/Yahoo/Custom για auto-fill).
- Κουμπί "Δοκιμή Σύνδεσης" → καλεί `email-imap-test` πριν την αποθήκευση.
- Μετά save: εμφανίζει το ίδιο connected state με badge "IMAP" αντί για "Gmail".

### 4. Routing fetch/send με βάση `provider_type`
- Το υπάρχον `useEmailMessages` / σημεία που καλούν `email-fetch`/`email-send` θα ελέγχουν το `provider_type` και θα δρομολογούν στο σωστό function.
- Εναλλακτικά: wrapper functions `email-fetch-router` / `email-send-router` που διαλέγουν.

### 5. Secret
- Νέο secret `EMAIL_CREDENTIALS_KEY` (encryption key 32 bytes) — θα ζητηθεί από τον χρήστη πριν τη μετάβαση σε build.

## Τεχνικές σημειώσεις

- IMAP/SMTP από edge functions: το Supabase Edge Runtime υποστηρίζει outbound TCP, οπότε `imapflow` + `nodemailer` δουλεύουν (έχουν χρησιμοποιηθεί σε production Deno deployments).
- Δεν αποθηκεύουμε plaintext passwords. Encryption at rest με AES-GCM μέσω `crypto.subtle` στα edge functions, key από Vault.
- Για Gmail manual: ο χρήστης πρέπει να χρησιμοποιήσει App Password (όχι κανονικό password) — θα το αναφέρουμε στο UI.

## Σειρά εκτέλεσης

1. Migration για `email_account_credentials` + `provider_type`.
2. Add secret `EMAIL_CREDENTIALS_KEY`.
3. Edge functions `email-imap-test`, `email-imap-fetch`, `email-imap-send`.
4. UI refactor `EmailAccountSetup` με tabs.
5. Routing στα κλήσεις fetch/send.

## Εκτός scope

- Auto-sync cron για IMAP (μπορεί να μπει σε επόμενο iteration — προς το παρόν manual refresh).
- OAuth για άλλους providers (Outlook/Yahoo OAuth).
