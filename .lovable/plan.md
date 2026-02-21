

# Chat: Missing Features Implementation

## 1. Auto-creation of Project Channels

When a project exists (or is created), automatically create a corresponding chat channel with the project team members.

### Approach
- Create a database trigger function `auto_create_project_channel` that fires on INSERT to `projects` table
  - Creates a `chat_channel` with `type='public'`, `project_id` set, name = project name
  - Adds the project creator as channel owner
- Create a trigger on `project_user_access` INSERT to auto-add team members to the project's chat channel
- Create a trigger on `project_user_access` DELETE to remove members from channel
- Add a one-time migration to create channels for ALL existing projects and add their current team members
- Also create channels for clients: for each client, create a channel and add all users who have access to that client's projects

### Database Changes (Migration)
- Trigger function: `auto_create_project_channel()` on `projects` INSERT
- Trigger function: `sync_project_team_to_chat()` on `project_user_access` INSERT/DELETE
- Backfill: INSERT channels for all existing projects + add current team members
- Backfill: INSERT channels for all existing clients + add relevant team members

---

## 2. Mentions (@user, @project, @task)

### Changes
- **ChatMessageInput.tsx**: Add `@` mention autocomplete popup
  - On typing `@`, show dropdown with users, projects, tasks filtered by search
  - Fetch data from `profiles`, `projects`, `tasks` tables
  - Insert mention as `@[Name](type:id)` format in content
  - Store mentions in `metadata.mentions` array: `[{type, id, name}]`
- **ChatMessageItem.tsx**: Parse and render mentions as clickable badges
  - User mentions navigate to user profile
  - Project mentions navigate to `/projects/:id`
  - Task mentions navigate to `/tasks/:id`

### New Component
- `src/components/chat/MentionInput.tsx` -- Mention autocomplete dropdown

---

## 3. File Sharing

### Changes
- **ChatMessageInput.tsx**: Enable the `onFileUpload` prop (already has Paperclip button but no handler wired)
- **ChatChannelView.tsx**: Pass file upload handler to ChatMessageInput
- **useChatMessages.ts**: Add `uploadAttachment()` function
  - Upload file to `chat-attachments` bucket
  - Create `chat_message_attachments` record
  - Send a message of type `file` with attachment metadata
- **ChatMessageItem.tsx**: Enhance attachment rendering
  - Image preview (inline thumbnail)
  - File download link for non-images

### Storage
- Ensure `chat-attachments` bucket exists with proper RLS policies

---

## 4. Full-Text Search

### Database Changes
- Add GIN index on `chat_messages.content` for text search
- Create function `search_chat_messages(query text, company_id uuid)` for full-text search

### New Component
- `src/components/chat/ChatSearchDialog.tsx` -- Search dialog with results
  - Search across messages, filter by channel/user/date
  - Click result to navigate to the message in its channel

### Changes
- **ChatChannelHeader.tsx**: Add search button that opens ChatSearchDialog
- **ChatSidebar.tsx**: Add global search button

---

## 5. Convert Message to Task / Brief

### Changes
- **ChatMessageItem.tsx**: Add dropdown menu items:
  - "Μετατροπή σε Task" -- opens task creation dialog pre-filled
  - "Μετατροπή σε Brief" -- opens brief form dialog pre-filled
- Link back to original message via `metadata.source_message_id`

### New Imports
- Use existing task creation patterns from `ProjectTasksManager`
- Use existing `BriefFormDialog` for brief creation

---

## 6. Link Message to Client/Project

### Changes
- **ChatMessageItem.tsx**: Add "Link to Project/Client" dropdown option
  - Opens small dialog to select project or client
  - Stores link in `metadata.linked_project_id` or `metadata.linked_client_id`
  - Shows linked badge on message

---

## 7. Tags on Messages

### Changes
- **ChatMessageItem.tsx**: Add "Tag" dropdown submenu with options: urgent, approved, pending
  - Uses existing `chat_message_tags` table
  - Shows tags as colored badges on the message
- **useChatMessages.ts**: Fetch tags alongside messages, add `addTag` / `removeTag` functions

---

## 8. Notifications Integration

### Changes
- **useChatMessages.ts**: On new message received via realtime, if user is mentioned or channel is not muted, create a notification entry
- **NotificationBell.tsx**: Include chat message notifications in the list
- Add notification type `chat_mention` and `chat_message` to the notification system

---

## 9. AI Layer (Edge Function)

### New Edge Function: `supabase/functions/chat-ai-assistant/index.ts`
- Endpoints:
  - `summarize` -- Summarize recent messages in a channel
  - `action-items` -- Extract action items from discussion
  - `weekly-recap` -- Generate weekly project recap
- Uses Lovable AI (no API key needed)

### Changes
- **ChatChannelHeader.tsx**: Add AI actions dropdown (Summarize, Extract Actions)
- Display AI responses as system messages or in a side panel

---

## 10. Role-based Channel Permissions

### Changes
- **ChatChannelHeader.tsx**: Add member management button for channel admins/owners
- **ChatCreateChannel.tsx**: Add member selection when creating private/group channels
- **useChatChannels.ts**: Respect `member_role` for edit/delete channel actions

### New Component
- `src/components/chat/ChatMemberManager.tsx` -- Add/remove members, change roles

---

## Files to Create

| File | Purpose |
|------|---------|
| Migration SQL | Triggers for auto-channel creation, backfill, search index |
| `src/components/chat/MentionInput.tsx` | @ mention autocomplete |
| `src/components/chat/ChatSearchDialog.tsx` | Full-text search dialog |
| `src/components/chat/ChatMemberManager.tsx` | Channel member management |
| `supabase/functions/chat-ai-assistant/index.ts` | AI summaries & actions |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/chat/ChatMessageInput.tsx` | Mentions, file upload wiring |
| `src/components/chat/ChatMessageItem.tsx` | Mentions rendering, convert to task/brief, tags, link to project |
| `src/components/chat/ChatChannelView.tsx` | File upload handler, search button |
| `src/components/chat/ChatChannelHeader.tsx` | Search, AI actions, member management |
| `src/components/chat/ChatSidebar.tsx` | Global search button |
| `src/hooks/useChatMessages.ts` | File upload, tags, search functions |
| `src/hooks/useChatChannels.ts` | Channel permissions logic |

## Implementation Priority

1. Auto-creation of project/client channels (database triggers + backfill)
2. File sharing (most requested core feature)
3. Mentions system
4. Convert to task/brief + link to project
5. Tags
6. Full-text search
7. Channel member management
8. Notifications
9. AI layer

