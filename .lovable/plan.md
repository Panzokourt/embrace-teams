

# Standardization: Μετάβαση Edge Functions σε Lovable AI Gateway

## Πρόβλημα

12 edge functions καλούν απευθείας `api.anthropic.com` με `ANTHROPIC_API_KEY`, ενώ 8 χρησιμοποιούν ήδη το Lovable AI Gateway. Αυτό δημιουργεί:
- 2 σημεία αποτυχίας (αν πέσει το ένα API, σπάνε μόνο μερικές λειτουργίες)
- 2 billing streams
- Ασυνεπή model naming/versioning

## Ποιες functions αλλάζουν

| Edge Function | Τώρα (Anthropic) | Μετά (Gateway) |
|---|---|---|
| `secretary-agent` | `claude-sonnet-4-20250514` | `google/gemini-2.5-pro` |
| `brain-analyze` | `claude-sonnet-4-20250514` | `google/gemini-2.5-pro` |
| `brain-deep-analyze` | claude-sonnet | `google/gemini-2.5-pro` |
| `analyze-project-files` | claude-sonnet | `google/gemini-2.5-pro` |
| `generate-media-plan` | claude-sonnet | `google/gemini-3-flash-preview` |
| `suggest-package` | claude-sonnet | `google/gemini-3-flash-preview` |
| `my-work-ai-chat` | claude-sonnet | `google/gemini-3-flash-preview` |
| `notes-ai-action` | claude-sonnet | `google/gemini-3-flash-preview` |
| `chat-ai-assistant` | claude-sonnet | `google/gemini-3-flash-preview` |
| `parse-document` | claude-sonnet | `google/gemini-3-flash-preview` |
| `wiki-ai-action` | claude (TBC) | `google/gemini-3-flash-preview` |
| `secretary-memory` | claude (TBC) | `google/gemini-3-flash-preview` |

## Model selection λογική

- **Heavy reasoning** (brain-analyze, brain-deep-analyze, secretary-agent, analyze-project-files): `google/gemini-2.5-pro`
- **Standard tasks** (τα υπόλοιπα): `google/gemini-3-flash-preview`

## Τι αλλάζει σε κάθε function

Κάθε function αντικαθιστά:
```text
// ΠΡΙΝ
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
fetch("https://api.anthropic.com/v1/messages", {
  headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
  body: JSON.stringify({ model: "claude-sonnet-4-20250514", messages: [...], max_tokens: ... })
})

// ΜΕΤΑ
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
  body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [...] })
})
```

Για streaming functions (secretary-agent, my-work-ai-chat): αλλαγή SSE parsing format (Anthropic → OpenAI-compatible).

## Τι ΔΕΝ αλλάζει

- Prompts/system messages παραμένουν ίδια
- Client-side code δεν αλλάζει καθόλου
- Tool calling format μετατρέπεται σε OpenAI-compatible (ήδη supported από gateway)

## Κίνδυνοι

- **Streaming format**: Anthropic SSE → OpenAI SSE (διαφορετικά event types). Θέλει προσεκτικό refactor στις streaming functions.
- **Tool calling syntax**: Anthropic tools → OpenAI tools (μικρές διαφορές στο schema). Κυρίως αφορά `secretary-agent`.

## Εκτίμηση

~12 αρχεία, κυρίως mechanical αλλαγές. Οι streaming functions (2-3) χρειάζονται περισσότερη προσοχή.

