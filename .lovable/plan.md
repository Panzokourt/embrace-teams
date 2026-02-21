
# Internal Chat System -- "Olseny Chat"

## Overview

A full-featured internal messaging system inspired by Slack/Messenger, with channels, DMs, threads, floating chat bubbles, and deep integration with projects, tasks, and clients. The chat is accessible from:
1. A dedicated page (`/chat`)
2. A new tab in the right sidebar panel
3. Floating Messenger-style chat windows at the bottom-right of the screen

---

## Phase 1: Database Schema

### New Tables

#### `chat_channels`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| company_id | uuid FK | |
| project_id | uuid FK (nullable) | Auto-linked project channel |
| name | text | Channel name |
| description | text (nullable) | |
| type | text | `public`, `private`, `direct`, `group` |
| created_by | uuid | |
| is_archived | boolean, default false | |
| avatar_url | text (nullable) | Channel avatar |
| last_message_at | timestamptz | For sorting |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `chat_channel_members`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| channel_id | uuid FK | |
| user_id | uuid FK | |
| role | text | `owner`, `admin`, `member` |
| muted | boolean, default false | |
| last_read_at | timestamptz | For unread tracking |
| joined_at | timestamptz | |

#### `chat_messages`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| channel_id | uuid FK | |
| user_id | uuid FK | Sender |
| parent_message_id | uuid FK (nullable) | Thread replies |
| content | text | Message body (markdown) |
| message_type | text | `text`, `file`, `system`, `action` |
| metadata | jsonb | Mentions, links, tags, etc. |
| is_pinned | boolean, default false | |
| is_edited | boolean, default false | |
| edited_at | timestamptz (nullable) | |
| deleted_at | timestamptz (nullable) | Soft delete |
| created_at | timestamptz | |

#### `chat_message_reactions`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| message_id | uuid FK | |
| user_id | uuid FK | |
| emoji | text | |
| created_at | timestamptz | |

#### `chat_message_attachments`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| message_id | uuid FK | |
| file_name | text | |
| file_path | text | Storage path |
| file_size | integer | |
| content_type | text | |
| created_at | timestamptz | |

#### `chat_message_tags`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| message_id | uuid FK | |
| tag | text | `urgent`, `approved`, `pending`, etc. |
| created_by | uuid | |
| created_at | timestamptz | |

### Realtime
- Enable realtime on `chat_messages` and `chat_channel_members` for live updates

### RLS Policies
- Members can only read/write messages in channels they belong to
- Channel visibility: public channels visible to all company members, private/DM only to members
- Admins/owners can manage channels

### Storage
- New bucket `chat-attachments` for file sharing

---

## Phase 2: Core Chat Components

### File Structure

```text
src/components/chat/
  ChatPage.tsx              -- Full page (/chat)
  ChatSidebar.tsx           -- Channel list + DM list
  ChatChannelView.tsx       -- Message list + input for a channel
  ChatMessageItem.tsx       -- Single message with actions
  ChatMessageInput.tsx      -- Rich input with mentions, attachments, emoji
  ChatThread.tsx            -- Thread/reply view
  ChatChannelHeader.tsx     -- Channel info, members, search, pin
  ChatCreateChannel.tsx     -- Dialog for creating channels/groups
  ChatMemberManager.tsx     -- Add/remove members
  ChatSearchDialog.tsx      -- Full-text search in messages
  ChatFloatingBubbles.tsx   -- Messenger-style floating windows
  ChatFloatingWindow.tsx    -- Single floating chat window
  ChatPanelView.tsx         -- Compact view for right sidebar panel
  ChatUserPresence.tsx      -- Online/offline indicators
  ChatPinnedMessages.tsx    -- Pinned messages drawer
  ChatReactions.tsx         -- Emoji reaction picker
```

### ChatPage (`/chat`)
- Full-screen layout: left sidebar (channels/DMs) + center (messages) + right (thread/details)
- Channel list grouped by: "Channels", "Project Channels", "Direct Messages"
- Unread counts and badges
- Search bar across all messages

### ChatSidebar
- Lists all channels the user is a member of
- Shows unread message count per channel
- "Create Channel" and "New DM" buttons
- Filter/search channels
- Online presence indicators on DM contacts

### ChatChannelView
- Virtualized message list (for performance with many messages)
- Auto-scroll to bottom on new messages
- Date dividers between message groups
- System messages (user joined, channel created, etc.)
- Real-time updates via Supabase Realtime subscriptions

### ChatMessageItem
- Avatar, name, timestamp
- Markdown rendering for content
- Hover actions: reply, react, pin, tag, convert to task, link to project
- Thread indicator (reply count)
- File attachment preview (images inline, other files as cards)
- Edit/delete own messages
- Mention highlights (@user, #project, !task)

### ChatMessageInput
- Multiline text input with markdown support
- @ mention autocomplete (users, projects, tasks)
- File drag & drop and attachment button
- Emoji picker
- Send on Enter, Shift+Enter for newline

---

## Phase 3: Right Sidebar Integration

### Updated `SecretaryPanel`
- Add a 4th tab: **"Chat"** with `MessageSquare` icon
- The chat tab shows `ChatPanelView` -- a compact version of the chat:
  - Mini channel list at top (horizontal scrollable pills)
  - Active conversation messages below
  - Input at bottom
  - Tap channel pill to switch conversations

### Updated `RightPanelTab` type
```typescript
export type RightPanelTab = "secretary" | "activity" | "notifications" | "chat";
```

---

## Phase 4: Floating Messenger-Style Chat

### ChatFloatingBubbles
- Fixed position at bottom-right of screen (above the main content)
- Shows small circular avatars of recent/active conversations
- Click to open a floating chat window
- Maximum 3 open windows simultaneously
- Minimize/close buttons on each window

### ChatFloatingWindow
- 350px wide, 450px tall floating card
- Channel/DM header with name and close/minimize
- Message list (compact view)
- Input field at bottom
- Draggable position (optional, can be static)
- Stacks horizontally from right to left

### State Management
- Floating chat state managed in a `ChatContext` provider
- Tracks: open windows, minimized windows, active conversations
- Persisted in localStorage for session continuity

---

## Phase 5: Operational Features

### Convert Message to Task
- Context menu action on any message
- Opens pre-filled task creation dialog with message content as description
- Links back to the original message

### Convert Message to Brief
- Similar to task conversion
- Opens brief form dialog with message content pre-filled

### Link to Client/Project
- Messages can be linked to a client or project via metadata
- Linked messages appear in the project/client activity feed

### Pin Messages
- Toggle pin on any message (channel admins)
- Pinned messages accessible from channel header drawer

### Tags
- Add tags (urgent, approved, pending, custom) to messages
- Filter messages by tag in search

### Notifications
- New message notifications integrated with existing notification system
- Smart filtering: muted channels dont notify, mentions always notify
- Desktop notifications (browser Notification API)

---

## Phase 6: AI Layer (via Backend Function)

### New Edge Function: `chat-ai-assistant`
- Conversation summary per channel (on demand)
- Auto-extract action items from discussions
- Weekly project recap based on project channel messages
- Detection of delays/risks from message patterns
- Decision log auto-generated from discussions

Uses Lovable AI (Gemini) -- no additional API key needed.

---

## Phase 7: Sidebar Navigation

### Updated `AppSidebar.tsx`
- Add "Chat" link with `MessageSquare` icon in `bottomNavItems`
- Show unread badge count next to the Chat nav item

---

## Files to Create

| File | Purpose |
|------|---------|
| Migration SQL | 6 new tables + RLS + realtime |
| `src/components/chat/ChatPage.tsx` | Full chat page |
| `src/components/chat/ChatSidebar.tsx` | Channel/DM list |
| `src/components/chat/ChatChannelView.tsx` | Message list + input |
| `src/components/chat/ChatMessageItem.tsx` | Single message |
| `src/components/chat/ChatMessageInput.tsx` | Rich input |
| `src/components/chat/ChatThread.tsx` | Thread view |
| `src/components/chat/ChatChannelHeader.tsx` | Channel header |
| `src/components/chat/ChatCreateChannel.tsx` | Create channel dialog |
| `src/components/chat/ChatMemberManager.tsx` | Member management |
| `src/components/chat/ChatSearchDialog.tsx` | Search messages |
| `src/components/chat/ChatFloatingBubbles.tsx` | Floating bubbles |
| `src/components/chat/ChatFloatingWindow.tsx` | Floating window |
| `src/components/chat/ChatPanelView.tsx` | Right panel compact view |
| `src/components/chat/ChatPinnedMessages.tsx` | Pinned messages |
| `src/components/chat/ChatReactions.tsx` | Emoji reactions |
| `src/contexts/ChatContext.tsx` | Chat state management |
| `src/hooks/useChatMessages.ts` | Messages query + realtime |
| `src/hooks/useChatChannels.ts` | Channels query + realtime |
| `supabase/functions/chat-ai-assistant/index.ts` | AI features |
| `src/pages/Chat.tsx` | Chat page route |

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/chat` route, wrap with ChatProvider |
| `src/components/layout/AppSidebar.tsx` | Add Chat nav item with unread badge |
| `src/components/layout/AppLayout.tsx` | Add ChatFloatingBubbles component |
| `src/components/secretary/SecretaryPanel.tsx` | Add "Chat" tab |
| `src/components/layout/TopBar.tsx` | Optional: add chat icon |

---

## Implementation Order

Due to the size of this feature, implementation will proceed in this order:

1. **Database migration** -- all tables, RLS, realtime, storage bucket
2. **Core hooks** -- `useChatChannels`, `useChatMessages`
3. **ChatContext** -- floating window state management
4. **Chat page** -- full page with sidebar + channel view + input
5. **Right sidebar tab** -- compact chat panel
6. **Floating Messenger windows** -- bubble system
7. **Operational features** -- convert to task, pin, tags, search
8. **AI layer** -- edge function for summaries and action items
9. **Navigation updates** -- sidebar link, unread badges

---

## Technical Notes

- All messages use **Supabase Realtime** for live updates (postgres_changes on chat_messages)
- File attachments stored in `chat-attachments` storage bucket with RLS
- Unread tracking via `chat_channel_members.last_read_at` compared to `chat_messages.created_at`
- Mentions stored in `chat_messages.metadata` as `{ mentions: [{ type: 'user'|'project'|'task', id: '...' }] }`
- Floating windows limited to 3 max, managed via ChatContext
- Thread replies use `parent_message_id` -- clicking "reply" opens thread panel
- Project channels auto-created when a project is created (via trigger or client-side logic)
