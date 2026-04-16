

# Secretary Multi-Model Support — Πλάνο

## Τι γίνεται

Προσθήκη **Model Selector** στο Secretary Chat με υποστήριξη τριών providers: Claude (Anthropic API), Gemini (Lovable Gateway), GPT (Lovable Gateway). Dual routing: Claude → direct Anthropic API, Gemini/GPT → Lovable AI Gateway. Κανένα υπάρχον feature δεν αλλάζει.

## Αρχιτεκτονική Routing

```text
SecretaryChat (selectedModel state)
    │
    │  body: { messages, model, current_page, page_context }
    ▼
secretary-agent Edge Function
    │
    ├─ model starts with "claude" → Anthropic API (ANTHROPIC_API_KEY ✅ exists)
    │   - Anthropic SSE format → normalize to our {type:"delta"} format
    │   - Tool calling: Anthropic native tool format
    │
    └─ else → Lovable AI Gateway (existing behavior)
        - google/gemini-2.5-pro, google/gemini-2.5-flash, openai/gpt-5 etc.
        - Tool calling: OpenAI format (existing)

quick-chat-gemini Edge Function
    │
    └─ Same: accept model, route Claude → Anthropic, else → Gateway
```

## Αλλαγές ανά αρχείο

### 1. `src/components/chat/ModelSelector.tsx` (Νέο)

Dropdown component με grouped models:
- **Best** (auto) — `auto` → defaults to `google/gemini-2.5-pro`
- **Claude** — Sonnet 4, Opus 4, Haiku 4.5
- **Gemini** — 2.5 Pro, 2.5 Flash, 3 Flash Preview
- **GPT** — GPT-5, GPT-5 Mini

Compact button style (όπως στο screenshot), εμφανίζεται κάτω-δεξιά στο input area.

### 2. `src/components/secretary/SecretaryChat.tsx`

- `selectedModel` state (default: `auto`)
- `ModelSelector` component στο input area, δίπλα στο Send button
- Το `selectedModel` περνά στο fetch payload: `body.model`
- Αν `model === 'auto'` ή λείπει → backend χρησιμοποιεί default (Gemini 2.5 Pro)
- Streaming parsing: ήδη χειρίζεται `{type: "delta"}` format — δεν αλλάζει

### 3. `supabase/functions/secretary-agent/index.ts`

- Parse `model` από request body (γραμμή ~1941)
- Αν `model` starts with `claude-`:
  - Call `https://api.anthropic.com/v1/messages` με `ANTHROPIC_API_KEY`
  - Anthropic SSE stream: parse `content_block_delta` events → normalize σε `{type:"delta", content}` format
  - Tool calling: convert `toolDefinitions` σε Anthropic format + handle `tool_use`/`tool_result` blocks
- Αν όχι Claude → existing Gateway logic, αλλά χρησιμοποιεί `model` parameter αντί hardcoded
- `callGateway` helper: δέχεται `model` parameter

### 4. `supabase/functions/quick-chat-gemini/index.ts`

- Parse `model` από request body
- Αν Claude → route σε Anthropic API (χωρίς tool calling, simple streaming)
- Αν άλλο → existing Gateway logic με dynamic model

## Tool Calling ανά Provider

| Feature | Lovable Gateway (Gemini/GPT) | Anthropic (Claude) |
|---------|-----|---------|
| Tool format | OpenAI `tools[]` | Anthropic `tools[]` (same schema, different wrapper) |
| Tool call detection | `finish_reason: "tool_calls"` | `stop_reason: "tool_use"` |
| Tool result format | `role: "tool"` message | `role: "user"` with `tool_result` block |

Η μετατροπή γίνεται στο Edge Function — ο client δεν αλλάζει καθόλου.

## Models List

```typescript
const AI_MODELS = [
  { id: 'auto', name: 'Best', provider: 'auto', description: 'Επιλέγει αυτόματα το καλύτερο' },
  // Claude
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'anthropic' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', provider: 'anthropic' },
  // Gemini
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google' },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'google' },
  // OpenAI
  { id: 'openai/gpt-5', name: 'GPT-5', provider: 'openai' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', provider: 'openai' },
];
```

## Secrets

`ANTHROPIC_API_KEY` — ήδη υπάρχει στο project. Δεν χρειάζεται setup.

## Αρχεία

| Αρχείο | Ενέργεια |
|--------|----------|
| `src/components/chat/ModelSelector.tsx` | Νέο component |
| `src/components/secretary/SecretaryChat.tsx` | Προσθήκη model state + selector UI |
| `supabase/functions/secretary-agent/index.ts` | Dual routing (Claude/Gateway) + dynamic model |
| `supabase/functions/quick-chat-gemini/index.ts` | Dual routing + dynamic model |

## Τι ΔΕΝ αλλάζει
- Conversation DB, memory, file processing, drag & drop, ConversationSidebar
- Quick actions, page context, voice commands
- Existing streaming format στον client

