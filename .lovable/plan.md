

# Inbox -- Email Integration (IMAP/SMTP)

## Overview

A new "Inbox" section that allows each user to connect their email account (Gmail, Outlook, or any IMAP/SMTP provider) and view/send emails directly from within the application. Emails are presented in a **messaging-style UI** where each thread looks like a chat conversation -- no signatures, no HTML clutter, just clean message bubbles.

---

## Architecture

The system works in 3 layers:

1. **User Settings**: Each user stores their email connection details (IMAP/SMTP server, port, email, app password) encrypted in the database
2. **Edge Functions**: Two backend functions handle the actual IMAP/SMTP connections -- one for fetching emails, one for sending
3. **Frontend UI**: A messaging-style interface that renders email threads as conversations

---

## Phase 1: Database Schema

### New Table: `email_accounts`

Stores each user's email server configuration.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| user_id | uuid FK (profiles) | Owner |
| company_id | uuid FK | |
| email_address | text | The connected email |
| display_name | text | Sender name |
| imap_host | text | e.g. imap.gmail.com |
| imap_port | integer | e.g. 993 |
| smtp_host | text | e.g. smtp.gmail.com |
| smtp_port | integer | e.g. 587 |
| username | text | Login username |
| encrypted_password | text | Encrypted app password |
| use_tls | boolean, default true | |
| is_active | boolean, default true | |
| last_sync_at | timestamptz | Last successful fetch |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### New Table: `email_messages`

Cached emails fetched from the user's mailbox for fast rendering.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| account_id | uuid FK (email_accounts) | |
| user_id | uuid FK | |
| message_uid | text | IMAP UID (unique per mailbox) |
| thread_id | text | For grouping threads (Message-ID/In-Reply-To/References) |
| subject | text | |
| from_address | text | |
| from_name | text | |
| to_addresses | jsonb | Array of recipients |
| cc_addresses | jsonb | |
| body_text | text | Plain text body (cleaned, no signatures) |
| body_html | text | Original HTML (kept for fallback) |
| is_read | boolean | |
| is_starred | boolean | |
| folder | text | INBOX, Sent, etc. |
| sent_at | timestamptz | |
| created_at | timestamptz | |

### RLS Policies
- Users can only access their own email accounts and messages
- No cross-user visibility

---

## Phase 2: Edge Functions

### `email-fetch` Edge Function

Connects to the user's IMAP server and fetches recent emails.

- Receives: `account_id` from the authenticated user
- Reads credentials from `email_accounts` table (server-side only)
- Uses `jsr:@workingdevshero/deno-imap` library for IMAP connection
- Fetches latest emails (configurable: last 50, or since last_sync_at)
- Strips HTML signatures and quoted text to extract clean message body
- Groups messages into threads using `Message-ID`, `In-Reply-To`, and `References` headers
- Stores/updates messages in `email_messages` table
- Updates `last_sync_at` on the account

### `email-send` Edge Function

Sends emails via the user's SMTP server.

- Receives: `account_id`, `to`, `cc`, `subject`, `body`, `reply_to_message_id` (optional)
- Reads SMTP credentials from `email_accounts`
- Sends email using Deno's SMTP capabilities
- Stores the sent message in `email_messages` with `folder = 'Sent'`
- Sets proper `In-Reply-To` and `References` headers for thread continuity

### Security Considerations
- Credentials are stored encrypted; the Edge Function decrypts them server-side
- JWT verification on both functions ensures only the account owner can access
- App Passwords recommended (not main passwords) -- guidance provided in UI

---

## Phase 3: Settings -- Email Account Setup

### New Card in Settings Page: "Email / Inbox"

A new settings card where users configure their email connection:

- **Email Address**: The email they want to connect
- **Display Name**: Name shown on sent emails
- **IMAP Settings**: Host, Port (with presets for Gmail, Outlook, Yahoo)
- **SMTP Settings**: Host, Port
- **Username & App Password**: For authentication
- **Test Connection** button: Calls the edge function to verify IMAP connectivity
- **Provider Presets**: Quick-fill buttons for common providers:
  - Gmail: imap.gmail.com:993 / smtp.gmail.com:587
  - Outlook: outlook.office365.com:993 / smtp.office365.com:587
  - Yahoo: imap.mail.yahoo.com:993 / smtp.mail.yahoo.com:587
- Helper text explaining how to create an App Password for Gmail (with link)

---

## Phase 4: Inbox UI -- Messaging Style

### Page: `/inbox`

A split-view layout similar to the Chat page:

**Left Panel -- Thread List**
- List of email threads, sorted by most recent message
- Each item shows: sender avatar/initials, sender name, subject, preview text, timestamp
- Unread threads highlighted
- Star toggle
- Search bar at top
- Filter tabs: All | Unread | Starred

**Right Panel -- Conversation View**
- Selected thread displayed as a conversation (chat bubbles)
- Incoming messages on the left, sent messages on the right
- Each bubble shows: sender name, timestamp, clean text content
- Signatures, disclaimers, and quoted text are stripped/hidden (with "Show original" toggle)
- Reply input at the bottom (like a chat input)
- "Reply All" and "Forward" options
- Attachment indicators (file name + size, download link)

### Visual Design
- No traditional email layout -- purely conversational
- Avatar + name + time above each bubble
- Background color differentiates incoming vs outgoing
- Minimal chrome, focused on content
- Empty state: "Connect your email in Settings to get started"

---

## Phase 5: Navigation Integration

### Sidebar
- Add "Inbox" nav item with `Mail` icon in the sidebar
- Show unread email count badge

### Route
- Add `/inbox` route in App.tsx

---

## Files to Create

| File | Purpose |
|------|---------|
| Migration SQL | `email_accounts` and `email_messages` tables with RLS |
| `supabase/functions/email-fetch/index.ts` | IMAP fetch edge function |
| `supabase/functions/email-send/index.ts` | SMTP send edge function |
| `src/pages/Inbox.tsx` | Inbox page |
| `src/components/inbox/InboxThreadList.tsx` | Left panel thread list |
| `src/components/inbox/InboxConversation.tsx` | Right panel conversation view |
| `src/components/inbox/InboxMessageBubble.tsx` | Single message bubble |
| `src/components/inbox/InboxComposeInput.tsx` | Reply/compose input |
| `src/components/inbox/InboxEmptyState.tsx` | Empty/setup state |
| `src/components/settings/EmailAccountSetup.tsx` | Settings card for email config |
| `src/hooks/useEmailAccount.ts` | Hook for email account CRUD |
| `src/hooks/useEmailMessages.ts` | Hook for fetching/caching emails |

## Files to Modify

| File | Changes |
|------|--------|
| `src/App.tsx` | Add `/inbox` route |
| `src/components/layout/AppSidebar.tsx` | Add Inbox nav item |
| `src/pages/Settings.tsx` | Add EmailAccountSetup card |
| `supabase/config.toml` | Add edge function configs |

---

## Implementation Order

1. Database migration (tables + RLS)
2. Edge functions (email-fetch, email-send)
3. Settings UI (email account setup with test connection)
4. Inbox page (thread list + conversation view)
5. Navigation updates (sidebar, route)

---

## Technical Notes

- **IMAP Library**: Using `jsr:@workingdevshero/deno-imap` which is a Deno-native IMAP client with TLS support
- **Signature Stripping**: Simple heuristic -- remove content after common signature markers (`--`, `Sent from`, lines of dashes, etc.)
- **Thread Grouping**: Uses standard email headers (`In-Reply-To`, `References`) to group messages into conversations
- **Credentials**: Stored in the database, accessible only server-side via Edge Functions. Users are guided to use App Passwords for security
- **Sync Strategy**: On-demand fetch (user opens Inbox or clicks refresh). Not real-time polling to avoid excessive IMAP connections
- **Rate Limiting**: Each fetch fetches the last 50 messages or messages since `last_sync_at`, whichever is fewer

