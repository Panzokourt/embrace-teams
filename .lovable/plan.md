# Inbox upgrades

Three improvements, all frontend/presentation only. The DB schema already has a `folder` column on `email_messages`, so no migration is needed.

## 1. Folder menu (Inbox / Sent / Drafts / Trash / Spam)

Add a compact vertical folder rail on the left of the thread list (or a Tabs row above the list on mobile) with:

- Inbox, Sent, Drafts, Trash, Spam, Starred
- Counts per folder (unread for Inbox, total for others)
- Icon + label, active state highlighted

Implementation:
- New `InboxFolderRail.tsx` component.
- Add `activeFolder` state in `Inbox.tsx` (default `inbox`).
- Filter `threads` by `folder` (matching `last_message.folder`) inside `Inbox.tsx` before passing to `InboxThreadList`. Starred = `is_starred=true` regardless of folder.
- Layout becomes: `[64px folder rail] [thread list panel] [conversation panel]` in the resizable group.

Note: data only appears where Gmail/IMAP sync has populated those folders. Existing sync already labels by Gmail labels; `Sent`/`Drafts`/etc. will surface as more syncs land.

## 2. Rich body rendering (HTML emails / newsletters)

Replace the current "plain text only" bubble path with a smart renderer in `InboxMessageBubble.tsx`:

- If `body_html` exists → sanitize with **DOMPurify** and render inside a scoped, sandbox-like container (full HTML, images, links, styled newsletter layout, like Gmail).
  - Container: `max-w-full overflow-x-auto`, prose-isolated (`all: revert` wrapper) so newsletter CSS doesn't bleed into the app.
  - Links: `target="_blank" rel="noopener noreferrer"`, auto.
  - Width: newsletters can extend to ~720px (wider bubble for HTML, narrower for plain).
- If only `body_text` → keep current chat-bubble styling, but auto-linkify URLs (so the LinkedIn screenshot stops looking like a code blob) using a small regex → `<a>` conversion.
- Keep the "Πλήρης / Συμπτυγμένη" toggle to show/hide signature/quoted reply in plain-text mode.

Add `isomorphic-dompurify` (or `dompurify` + types) via `bun add`.

## 3. Image filtering (no signature/tracking images)

Today `extractImagesFromHtml` pulls every `<img>` and displays them as a gallery below the bubble. Remove that block entirely — when we render the HTML body, inline images naturally appear in context.

For plain-text messages, do not show any external images at all (they would only be signature/tracking junk).

Attachments (real `email_attachments` rows) continue to render as download chips as today.

Tracking pixel hardening inside the sanitized HTML:
- After DOMPurify, strip `<img>` tags whose `width`/`height` ≤ 2 or whose `src` matches common tracker hosts (`/track`, `/pixel`, `/beacon`, `open?`, `mailtrack`, `=open`).
- Strip `<img>` with no `alt` AND size <= 2.

## Files to change

- `src/pages/Inbox.tsx` — add folder rail + folder filter state.
- `src/components/inbox/InboxThreadList.tsx` — accept `activeFolder` label for header; counts come from parent.
- `src/components/inbox/InboxMessageBubble.tsx` — new HTML rendering path, drop image gallery, linkify plain text.
- `src/components/inbox/inboxUtils.ts` — add `linkifyText`, `sanitizeEmailHtml`, `stripTrackingImages`, folder metadata helpers.
- New: `src/components/inbox/InboxFolderRail.tsx`.
- `package.json` — add `isomorphic-dompurify`.

No backend, RLS, or schema changes.
