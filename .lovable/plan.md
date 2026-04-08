

# Fix Interactive Blocks in QuickChatBar

## Problem
The QuickChatBar renders AI responses using only `ReactMarkdown`, ignoring the `:::actions`, `:::input`, `:::table` etc. block syntax that the Secretary agent returns. The full Secretary page uses `parseAndRenderContent` from `ActionRenderer.tsx` which properly renders these as interactive buttons, inputs, selects, etc. — but QuickChatBar doesn't.

## Solution
Import and use `parseAndRenderContent` in the QuickChatBar's message rendering, exactly as `SecretaryChat.tsx` does. This will parse the `:::` blocks and render them as interactive UI components inline within the chat.

## Changes

### `src/components/quick-chat/QuickChatBar.tsx`
1. Import `parseAndRenderContent` from `../secretary/ActionRenderer`
2. Replace the assistant message rendering (lines 471-474) to use `parseAndRenderContent` instead of raw `ReactMarkdown`
3. The `onSendMessage` callback will be `sendMessage` — so clicking an action button sends the response back into the chat
4. Each parsed part that's a string gets rendered with `ReactMarkdown`, and each React node (button/input/table/chart) renders inline — same pattern as `SecretaryChat.tsx`

### Result
- Buttons like "Δημιουργία έργου" render as clickable buttons
- Input fields render inline for user to fill in
- Tables, charts, progress bars all render properly
- All interactions send responses back to the AI conversation

