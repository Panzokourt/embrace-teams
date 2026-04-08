

# AI Memory & Cross-Chat Context System

## Πρόβλημα
Κάθε chat session (Quick Chat, Sidebar, Main Page) ξεκινά χωρίς μνήμη. Ο χρήστης πρέπει να επαναλαμβάνει πληροφορίες και να ξανα-επισυνάπτει αρχεία. Δεν υπάρχει πρόσβαση σε ιστορικό από άλλα chats ή από τα chat channels της εφαρμογής.

## Λύση — Memory Layer + Context Agent

### Αρχιτεκτονική

```text
┌─────────────────────────────────────┐
│  QuickChat / Sidebar / Main Chat    │
│  (all share same secretary-agent)   │
└──────────────┬──────────────────────┘
               │ sends messages + conversation_id
               ▼
┌─────────────────────────────────────┐
│         secretary-agent             │
│  ┌───────────────────────────────┐  │
│  │  NEW: recall_memory tool     │  │
│  │  NEW: search_past_chats tool │  │
│  │  NEW: search_chat_channels   │  │
│  │  NEW: save_memory tool       │  │
│  └───────────────────────────────┘  │
│  + Auto-inject recent memory into   │
│    system prompt (last 5 summaries) │
└─────────────────────────────────────┘
```

### 1. Νέος πίνακας: `secretary_memory` (Migration)
Αποθηκεύει key facts, αρχεία που αναλύθηκαν, αποφάσεις, και context — ανά χρήστη.

```sql
CREATE TABLE public.secretary_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL DEFAULT 'general', -- general, file_analysis, decision, preference, project_context
  key text NOT NULL,           -- short identifier e.g. "creative_brief_govgr"
  content text NOT NULL,       -- the actual memory content (summary, key points)
  source_conversation_id uuid REFERENCES secretary_conversations(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}', -- file names, entity IDs, etc.
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.secretary_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own memory"
  ON public.secretary_memory FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_secretary_memory_user ON public.secretary_memory(user_id);
CREATE INDEX idx_secretary_memory_search ON public.secretary_memory USING gin(to_tsvector('simple', content));
```

### 2. Νέα tools στο `secretary-agent` (4 εργαλεία)

**`save_memory`** — Αποθηκεύει σημαντική πληροφορία (αρχείο που αναλύθηκε, απόφαση, preference)
- Ο agent καλεί αυτό αυτόματα μετά από ανάλυση αρχείου ή σημαντική απόφαση
- Parameters: `category`, `key`, `content`, `metadata`

**`recall_memory`** — Αναζήτηση στη μνήμη του χρήστη
- Full-text search στο `secretary_memory`
- Parameters: `query`, `category` (optional), `limit`

**`search_past_chats`** — Αναζήτηση σε παλιές secretary conversations
- Ψάχνει στο `secretary_messages` για relevant context
- Parameters: `query`, `limit`

**`search_chat_channels`** — Αναζήτηση στα team chat channels
- Χρησιμοποιεί το existing `search_chat_messages` DB function
- Parameters: `query`, `limit`

### 3. Auto-inject memory στο system prompt
Στο secretary-agent, πριν κάθε κλήση:
- Φέρνει τα τελευταία 10 memories του χρήστη
- Τα προσθέτει στο system prompt ως "Μνήμη χρήστη"
- Ο agent ξέρει ήδη τι έχει αναλυθεί, τι αποφάσεις πάρθηκαν

### 4. Auto-save memory μετά από ανάλυση
Στο system prompt, θα προστεθεί οδηγία:
> "Μετά από κάθε ανάλυση αρχείου, σημαντική απόφαση ή νέα πληροφορία, κάλεσε save_memory για να αποθηκεύσεις τα key findings. Αυτό σε βοηθά να θυμάσαι σε μελλοντικές συνομιλίες."

### 5. Εφαρμογή σε όλα τα chat interfaces
Δεν χρειάζεται αλλαγή στα frontend components — όλα χρησιμοποιούν ήδη τον `secretary-agent`. Η μνήμη θα λειτουργεί αυτόματα σε QuickChat, Sidebar και Main Page γιατί γίνεται inject server-side.

Για το `quick-chat-gemini` (μεγάλα αρχεία): θα προστεθεί η ίδια λογική memory injection + μετά την απάντηση, ο QuickChatBar θα αποθηκεύει auto-summary μέσω ένα μικρό κλήση save.

## Files

| File | Αλλαγή |
|------|--------|
| Migration | Νέος πίνακας `secretary_memory` με RLS |
| `supabase/functions/secretary-agent/index.ts` | +4 tools (save/recall_memory, search_past_chats, search_chat_channels), auto-inject memory στο system prompt |
| `supabase/functions/quick-chat-gemini/index.ts` | Inject memory context, post-response summary save |
| `src/components/quick-chat/QuickChatBar.tsx` | Μετά από Gemini response, save summary στο `secretary_memory` |

