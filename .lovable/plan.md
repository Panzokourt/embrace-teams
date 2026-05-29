## Manual IMAP/SMTP Email Connection

Επέκταση του email integration ώστε εκτός από Gmail OAuth, να μπορεί ο χρήστης να συνδέσει οποιοδήποτε mailbox με χειροκίνητες ρυθμίσεις (IMAP για receive, SMTP για send).

### 1. Database migration

- Προσθήκη `provider_type TEXT NOT NULL DEFAULT 'gmail_oauth'` στο `email_accounts` (values: `gmail_oauth` | `imap_smtp`).
- Backfill: existing rows → `gmail_oauth`.
- Επιβεβαίωση ότι τα ήδη υπάρχοντα fields (`imap_host`, `imap_port`, `smtp_host`, `smtp_port`, `username`, `encrypted_password`, `use_tls`) επαρκούν — δεν χρειάζονται νέα.

### 2. Edge functions (νέες, με `verify_jwt = false` + in-code JWT validation)

- **`email-imap-test`** — δέχεται host/port/user/password, κάνει IMAP login + SMTP `verify()`, επιστρέφει `{ ok, imap, smtp, error? }`. Δεν αποθηκεύει τίποτα.
- **`email-imap-save`** — κρυπτογραφεί το password με `EMAIL_CREDENTIALS_KEY` (AES-GCM), κάνει upsert στο `email_accounts` με `provider_type='imap_smtp'`.
- **`email-imap-fetch`** — fetch των N πιο πρόσφατων messages από INBOX, parse (subject/from/to/date/body/attachments), insert στο `email_messages` με dedup σε `message_id`.
- **`email-imap-send`** — ίδιο contract με το `email-send` (to, subject, html/text, cc, bcc, reply-to), αποστολή μέσω SMTP.

Libraries: `npm:imapflow`, `npm:nodemailer`, `npm:mailparser`.

### 3. Routing layer

Σε `useEmailMessages` / send hooks: διαβάζουμε `provider_type` του ενεργού account και καλούμε:
- `gmail_oauth` → `email-fetch` / `email-send` (όπως τώρα)
- `imap_smtp` → `email-imap-fetch` / `email-imap-send`

### 4. UI — `EmailAccountSetup.tsx`

Refactor σε Tabs:
- **Tab "Gmail" (OAuth)** — existing flow αμετάβλητο.
- **Tab "Manual (IMAP/SMTP)"** — νέα φόρμα:
  - Preset dropdown (Gmail / Outlook / Yahoo / Custom) που προσυμπληρώνει hosts/ports.
  - Fields: Email, Display Name, IMAP host/port, SMTP host/port, Username, Password, TLS toggle.
  - **"Test Connection"** button → καλεί `email-imap-test`, δείχνει inline success/error.
  - **"Save"** button (ενεργοποιείται μόνο μετά από επιτυχές test) → καλεί `email-imap-save`.

### 5. Out of scope (να γίνει σε επόμενο iteration αν χρειαστεί)

- Cron auto-sync για IMAP accounts (προς το παρόν manual refresh button).
- OAuth για Outlook/Yahoo.
- IDLE / push για realtime IMAP.

### Technical notes

- Κρυπτογράφηση: AES-GCM 256, key από `EMAIL_CREDENTIALS_KEY` (base64 → 32 bytes), random IV per record, αποθήκευση `iv:ciphertext:tag` σε base64 στο `encrypted_password`.
- Validation: Zod schemas σε όλες τις edge functions, host/port checks, RLS παραμένει το ίδιο (`company_id` scoped).
- Error mapping: invalid_credentials, connection_refused, tls_error, timeout → user-friendly Greek messages.
