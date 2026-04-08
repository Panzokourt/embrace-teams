

# Hybrid AI: Claude + Gemini για μεγάλα αρχεία

## Πρόβλημα
Η αυτόματη περικοπή στους 80K χαρακτήρες χάνει πληροφορίες. Ο Claude έχει ~200K token limit που μπορεί να ξεπεραστεί εύκολα. Χρειαζόμαστε εναλλακτική για μεγάλα αρχεία.

## Λύση
Hybrid approach: όταν τα συνημμένα αρχεία ξεπερνούν ένα threshold (~100K chars), το QuickChat στέλνει σε ένα **νέο edge function** που χρησιμοποιεί **Gemini 2.5 Pro** (1M token context) μέσω Lovable AI Gateway — χωρίς tool calls, μόνο ανάλυση/συζήτηση. Για κανονικά μηνύματα ή μικρά αρχεία, παραμένει ο secretary-agent με Claude.

## Αλλαγές

### 1. Νέο Edge Function: `quick-chat-gemini`
Ένα απλό streaming chat function που χρησιμοποιεί Gemini 2.5 Pro μέσω Lovable AI Gateway:
- Δέχεται messages array (με multimodal content — text + images)
- Streaming SSE response (OpenAI-compatible format)
- Χωρίς tool calls — καθαρά Q&A/ανάλυση αρχείων
- System prompt σε ελληνικά, ρόλος βοηθού εταιρείας

### 2. QuickChatBar: Αφαίρεση περικοπής + αυτόματη επιλογή endpoint
- **Αφαίρεση** των `MAX_TEXT` και `MAX_CHARS` truncation limits
- Υπολογισμός συνολικού μεγέθους κειμένου αρχείων
- Αν > 100K chars → στέλνει στο `quick-chat-gemini` αντί `secretary-agent`
- Αν ≤ 100K chars → στέλνει κανονικά στο `secretary-agent` (Claude + tools)
- Εμφάνιση status "Χρήση Gemini για μεγάλο αρχείο..." όταν γίνεται switch
- Η SSE parsing παραμένει ίδια (format OpenAI-compatible)

### 3. Gemini multimodal format
Το Gemini μέσω Lovable AI Gateway δέχεται OpenAI-compatible messages. Τα images θα σταλούν ως base64 URL data URIs, τα κείμενα αρχείων ως text content.

## Τεχνικά

**Edge function (`quick-chat-gemini`):**
```typescript
// Calls Lovable AI Gateway with Gemini 2.5 Pro
fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
  body: JSON.stringify({
    model: "google/gemini-2.5-pro",
    messages: [...],
    stream: true
  })
});
// Returns the stream directly as SSE
```

**QuickChatBar routing logic:**
```typescript
// Calculate total content size
const totalChars = fileParts
  .filter(p => p.type === 'text')
  .reduce((sum, p) => sum + p.text.length, 0);

const useGemini = totalChars > 100000;
const endpoint = useGemini ? 'quick-chat-gemini' : 'secretary-agent';
```

**SSE parsing:** Ο Gemini endpoint θα επιστρέφει OpenAI-compatible SSE (choices[0].delta.content), οπότε θα χρειαστεί μικρή προσαρμογή στον parser του QuickChat ή μετατροπή στο edge function στο ίδιο format (type: delta) που χρησιμοποιεί ήδη ο secretary-agent.

## Files

| File | Αλλαγή |
|------|--------|
| `supabase/functions/quick-chat-gemini/index.ts` | Νέο — streaming chat με Gemini 2.5 Pro via Lovable AI |
| `src/components/quick-chat/QuickChatBar.tsx` | Αφαίρεση truncation, routing logic βάσει μεγέθους αρχείων |

