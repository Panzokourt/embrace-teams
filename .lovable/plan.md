

# Secretary Chat — Streaming & Speed Optimization

## Problem
1. **No streaming**: The secretary-agent completes ALL work (up to 8 Anthropic API calls + tool executions) before sending a single JSON response. User sees "Σκέφτομαι..." for 10-30 seconds.
2. **Heavy model**: Uses `claude-sonnet-4-20250514` for every iteration, even simple queries.

## Solution: Hybrid Streaming

### Architecture

```text
Client                    Edge Function
  |                           |
  |--- POST /secretary ------>|
  |                           |-- DB context queries (parallel)
  |<-- SSE: thinking ---------|
  |                           |-- Anthropic call #1
  |<-- SSE: tool_call --------|-- (tool detected)
  |                           |-- Execute tool
  |<-- SSE: tool_result ------|
  |                           |-- Anthropic call #2 (with tool result)
  |<-- SSE: streaming text -->|-- (final response, streamed)
  |<-- SSE: [DONE] -----------|
```

The user sees:
1. "Αναζήτηση projects..." (while tools execute)
2. Text appearing word-by-word (final response streamed)

### Changes

**`supabase/functions/secretary-agent/index.ts`**
- Switch response from JSON to **SSE stream**
- Tool-calling iterations remain non-streaming (they're short)
- Send progress SSE events: `{"type":"status","text":"Εκτέλεση: list_projects..."}`
- Final Anthropic call uses `stream: true` — forward text deltas as SSE
- Keep all existing tools and system prompt unchanged

**`src/components/secretary/SecretaryChat.tsx`**
- Replace `await response.json()` with SSE reader (EventSource-like fetch)
- Show intermediate status messages ("Αναζήτηση...", "Δημιουργία task...")
- Accumulate streamed text and update message in real-time
- Keep all existing rendering logic (ActionRenderer, markdown, etc.)

### SSE Protocol

```
data: {"type":"status","text":"Εκτελώ list_projects..."}

data: {"type":"delta","content":"Τα "}
data: {"type":"delta","content":"projects "}
data: {"type":"delta","content":"σου είναι:"}

data: {"type":"done","reply":"full content here"}

data: [DONE]
```

### Speed Gains
- **Perceived latency**: ~1-2s (first text appears) vs current 10-30s
- **Tool progress**: User sees what the AI is doing in real-time
- **No model change needed**: Streaming alone eliminates the perceived delay

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/secretary-agent/index.ts` | SSE response, stream final call, progress events during tool loop |
| `src/components/secretary/SecretaryChat.tsx` | SSE reader, real-time text accumulation, status indicators |

No database changes. All existing tools, system prompt, and ActionRenderer remain unchanged.

