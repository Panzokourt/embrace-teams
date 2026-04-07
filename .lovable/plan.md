

# Μετάβαση σε Claude (Anthropic) — Όλα τα AI Edge Functions

## Τι αλλάζει

Αντικατάσταση του Lovable AI Gateway (`ai.gateway.lovable.dev`) με απευθείας κλήσεις στο **Anthropic Messages API** (`api.anthropic.com/v1/messages`) σε **12 edge functions**, χρησιμοποιώντας το μοντέλο **claude-sonnet-4-20250514**.

## Βήμα 1: Προσθήκη ANTHROPIC_API_KEY

Θα χρειαστεί να εισάγεις το Anthropic API key σου. Μπορείς να το βρεις στο [console.anthropic.com](https://console.anthropic.com/) → API Keys.

## Βήμα 2: Αλλαγές σε Edge Functions

Κάθε function αλλάζει από:
```typescript
// ΠΡΙΝ
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
  body: JSON.stringify({ model: "google/gemini-...", messages, stream: true })
});
```

σε:
```typescript
// ΜΕΤΑ
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [...],
    stream: true, // where applicable
  })
});
```

**Response parsing** αλλάζει επίσης — Anthropic χρησιμοποιεί διαφορετικό format:
- Non-streaming: `response.content[0].text` αντί `choices[0].message.content`
- Streaming: SSE events `content_block_delta` με `delta.text` αντί `choices[0].delta.content`
- Tool calling: `tool_use` content blocks αντί OpenAI-style tool_calls

### Affected Functions (12)

| Function | Streaming | Tool Calling |
|----------|-----------|-------------|
| `secretary-agent` | ✅ | ✅ (πολλά tools) |
| `my-work-ai-chat` | ✅ | ❌ |
| `chat-ai-assistant` | ❌ | ❌ |
| `notes-ai-action` | ❌ | ❌ |
| `analyze-document` | ❌ | ❌ |
| `analyze-project-files` | ❌ | ❌ |
| `analyze-media-plan-excel` | ❌ | ❌ |
| `generate-media-plan` | ❌ | ❌ |
| `brain-analyze` | ❌ | ✅ (structured output) |
| `brain-deep-analyze` | ❌ | ❌ |
| `parse-document` | ❌ | ❌ (vision/multimodal) |
| `suggest-package` | ❌ | ❌ |

### Ειδικές περιπτώσεις

- **`parse-document`**: Χρησιμοποιεί vision (εικόνες base64). Claude υποστηρίζει images μέσω `image` content blocks.
- **`secretary-agent`**: Πολύπλοκο agent loop με tool calling — απαιτεί μετατροπή tool format σε Anthropic style.
- **`brain-analyze`**: Structured output μέσω tool calling — μετατροπή σε Anthropic tool_use format.
- **Streaming functions**: Ο SSE parser στο frontend (`SecretaryChat`, `MyWorkAIChat`) πρέπει να ενημερωθεί για το Anthropic SSE format, ή εναλλακτικά κάνουμε transform στο edge function ώστε να στέλνει OpenAI-compatible SSE στον client (λιγότερες client αλλαγές).

### Approach για streaming

Θα κάνουμε **server-side transform** — το edge function θα διαβάζει Anthropic SSE και θα τα μετατρέπει σε OpenAI-compatible format πριν τα στείλει στον client. Έτσι δεν αλλάζει κανένα frontend component.

## Files to Modify (12 edge functions)

| File | Scope |
|------|-------|
| `supabase/functions/secretary-agent/index.ts` | Gateway → Anthropic, tool calling format, SSE transform |
| `supabase/functions/my-work-ai-chat/index.ts` | Gateway → Anthropic, SSE transform |
| `supabase/functions/chat-ai-assistant/index.ts` | Gateway → Anthropic, response parsing |
| `supabase/functions/notes-ai-action/index.ts` | Gateway → Anthropic, response parsing |
| `supabase/functions/analyze-document/index.ts` | Gateway → Anthropic, response parsing |
| `supabase/functions/analyze-project-files/index.ts` | Gateway → Anthropic, response parsing |
| `supabase/functions/analyze-media-plan-excel/index.ts` | Gateway → Anthropic, response parsing |
| `supabase/functions/generate-media-plan/index.ts` | Gateway → Anthropic, response parsing |
| `supabase/functions/brain-analyze/index.ts` | Gateway → Anthropic, tool calling format |
| `supabase/functions/brain-deep-analyze/index.ts` | Gateway → Anthropic, response parsing |
| `supabase/functions/parse-document/index.ts` | Gateway → Anthropic, vision format |
| `supabase/functions/suggest-package/index.ts` | Gateway → Anthropic, response parsing |

Καμία αλλαγή σε frontend components — μόνο backend edge functions.

