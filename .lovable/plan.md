

# Quick Chat Bar — Floating Bottom AI Chat

## Concept
A compact chat bar fixed at the bottom of the screen (like the uploaded screenshot), triggered by a TopBar button or keyboard shortcut (⌘+I). It connects to the same Secretary AI agent but in a minimal, non-intrusive overlay — no sidebar, no full page.

## Changes

### 1. New `QuickChatBar` Component
A fixed-position bar at the bottom center of the viewport:
- Collapsed state: single-line input with placeholder "What can I help you with today?", "New Chat" dropdown, send button
- Expanded state: shows recent messages above the input (max ~300px height), scrollable
- Uses the same `sendMessage` logic from SecretaryChat (calls `secretary-agent` edge function with SSE streaming)
- Maintains its own lightweight conversation state (messages array, conversationId)
- "New Chat" button resets the conversation
- Shortcut: `⌘+I` (or `Ctrl+I`) toggles visibility
- Clicking outside or pressing `Escape` collapses/hides it
- Smooth slide-up animation on open

### 2. TopBar: Add Quick Chat Button
Add a sparkle/bot icon button next to the Work Mode button in the right actions area. Clicking it toggles the QuickChatBar visibility via a shared state (context or callback prop).

### 3. State Management
Add `quickChatOpen` state in the main layout (`AppLayout` or similar) and pass toggle function to TopBar. The `QuickChatBar` component mounts globally (always in DOM, visibility toggled).

### 4. Keyboard Shortcut
Global `⌘+I` / `Ctrl+I` listener in the QuickChatBar component to toggle open/close.

## Technical Details

- The bar reuses the SSE streaming logic from SecretaryChat (fetch to `secretary-agent`, parse SSE events)
- Messages rendered with ReactMarkdown (same as SecretaryChat)
- Conversation persisted to `secretary_conversations` / `secretary_messages` tables
- The bar sits at `fixed bottom-0 left-1/2 -translate-x-1/2` with `max-w-2xl w-full`
- z-index high enough to overlay content but below modals

## Files

| File | Change |
|------|--------|
| `src/components/quick-chat/QuickChatBar.tsx` | New — floating bottom chat bar with streaming AI, conversation management |
| `src/components/layout/TopBar.tsx` | Add bot/sparkle icon button that toggles quick chat |
| `src/components/layout/AppLayout.tsx` (or equivalent) | Add `quickChatOpen` state, render `QuickChatBar`, pass toggle to TopBar |

