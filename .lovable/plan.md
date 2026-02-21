

# Inbox UI Overhaul & Feature Expansion

## Overview
Comprehensive upgrade of the Inbox module with resizable panels, improved message rendering, attachments support, reply options, and cross-entity linking (clients, projects, tasks, chat).

---

## 1. Resizable Thread List Panel
**What:** Replace the fixed-width thread list (`w-96`) with a `ResizablePanelGroup` so users can drag the divider to resize.

**Technical:**
- Use `react-resizable-panels` (already installed) in `Inbox.tsx`
- Left panel: `InboxThreadList` (default 30%, min 20%)
- Right panel: conversation view (fills remaining space)

---

## 2. Message Bubble UI Improvements

### 2a. White background for incoming messages
Replace `bg-muted` with `bg-white dark:bg-card border border-border/40` on incoming message bubbles.

### 2b. Left-align incoming messages
Remove `max-w-[85%]` restriction on incoming messages and align them to the left edge of the conversation area. Remove `max-w-3xl mx-auto` centering from the messages container.

### 2c. Strip signatures and clutter from display
Enhance the `stripSignature` and `stripQuotedText` functions used during sync. Additionally, add frontend-side stripping to handle edge cases (e.g., "Unsubscribe" links, address blocks, disclaimer footers).

### 2d. Show images from emails
Parse `body_html` to extract `<img>` tags and display them below the text content as clickable thumbnails. Also handle Gmail inline image attachments (CID references) by extracting image parts from the Gmail API response.

---

## 3. Show Outgoing Messages
Currently outgoing messages (folder = "Sent") are only visible if they share a thread_id. The `email-fetch` edge function only fetches `INBOX` label. 

**Fix:** Also fetch `SENT` label messages from Gmail API to include outgoing messages in threads. Add a second API call for sent messages or use `labelIds=INBOX,SENT` query.

---

## 4. Attachment Support

### 4a. Database: New `email_attachments` table
```sql
CREATE TABLE public.email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.email_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  filename text NOT NULL,
  mime_type text,
  size_bytes integer,
  gmail_attachment_id text,
  storage_path text,
  created_at timestamptz DEFAULT now()
);
```

### 4b. Backend: Extract attachments during sync
Update `email-fetch` to detect attachment parts in Gmail payload and store metadata in `email_attachments`. Download on-demand via a new endpoint or lazy-load from Gmail API.

### 4c. Frontend: Display attachment chips
Show small clickable buttons/chips below each message bubble with filename and file icon. Clicking downloads the attachment.

### 4d. Send attachments
Update `InboxComposeInput` to support file upload (via a Paperclip button). Encode as base64 multipart MIME in `email-send`. Store sent attachments in the `email_attachments` table.

---

## 5. Reply / Reply All / Forward Actions
Add a dropdown or button group per message with:
- **Reply** (current behavior, to sender only)
- **Reply All** (includes all To + CC recipients)
- **Forward** (opens compose with body prefilled)

Update `InboxConversation` to pass the selected reply mode to `InboxComposeInput`, which will pre-fill the To/CC fields accordingly.

---

## 6. Link Email to Client / Project / Task

### 6a. Database: New `email_entity_links` table
```sql
CREATE TABLE public.email_entity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id uuid REFERENCES public.email_messages(id) ON DELETE CASCADE,
  thread_id text,
  entity_type text NOT NULL, -- 'client', 'project', 'task'
  entity_id uuid NOT NULL,
  user_id uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);
```

### 6b. Frontend: Link action button
Add a "Link" button in the conversation header or per-message menu. Opens a dialog/popover where the user can search and select a Client, Project, or Task. Show linked entities as badges in the thread header.

---

## 7. Mention Email Thread in Chat
Add email as a mentionable entity type in the Chat `MentionInput`. When a user types `@email`, show recent threads. Insert a special mention that renders as a clickable card linking to the Inbox thread.

---

## Implementation Order

| Step | Component | Dependencies |
|------|-----------|-------------|
| 1 | Resizable panels | None |
| 2 | Message bubble UI (white bg, left-align, strip sigs, images) | None |
| 3 | Fetch sent messages | Backend change |
| 4 | `email_attachments` table + sync + display + send | DB migration |
| 5 | Reply/Reply All/Forward | None |
| 6 | `email_entity_links` table + link UI | DB migration |
| 7 | Chat email mention | Step 6 |

---

## Files to Create/Modify

**New files:**
- None (all changes in existing components)

**Modified files:**
- `src/pages/Inbox.tsx` - ResizablePanelGroup layout
- `src/components/inbox/InboxMessageBubble.tsx` - White bg, left-align, images, attachment chips, reply actions
- `src/components/inbox/InboxConversation.tsx` - Remove centering, reply mode, link button
- `src/components/inbox/InboxComposeInput.tsx` - Reply All/Forward support, file attachments
- `src/components/inbox/InboxThreadList.tsx` - Minor adjustments
- `src/hooks/useEmailMessages.ts` - Add attachment types, entity link types
- `supabase/functions/email-fetch/index.ts` - Fetch SENT, extract attachments
- `supabase/functions/email-send/index.ts` - Multipart MIME for attachments
- `src/components/chat/MentionInput.tsx` - Email mention type

**New migrations:**
- `email_attachments` table with RLS
- `email_entity_links` table with RLS

