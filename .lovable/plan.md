

# Phase 1 + 3 · Vector Store/Semantic Search + Model Router

Υλοποιούμε ταυτόχρονα δύο foundational layers που ξεκλειδώνουν όλες τις μετέπειτα φάσεις: **πραγματικό semantic retrieval** και **κεντρικό model routing για cost optimization**.

---

## Τι θα παραδοθεί

### Phase 1 · Vector store + Semantic Knowledge

- `pgvector` ενεργό στη βάση.
- Embeddings σε `kb_articles`, `kb_raw_sources`, `secretary_memory` με proper chunking για τα articles/sources.
- Hybrid retrieval (semantic + full‑text fallback) στο Wiki Q&A και στη μνήμη του Secretary.
- One‑click backfill για όσα δεδομένα ήδη υπάρχουν.

### Phase 3 · Model router

- Κεντρικό «brain» που αποφασίζει ποιο μοντέλο κάθε task (lite / flash / pro / embeddings).
- Όλα τα 12 AI edge functions να περνούν από αυτό αντί για hardcoded model.
- Logging κάθε AI κλήσης + admin tab «AI Usage» με cost & latency.

---

## Database changes (migration)

```text
extensions:
  + vector  (pgvector)

new table: kb_article_chunks
  id uuid pk, article_id uuid fk → kb_articles, company_id uuid,
  chunk_index int, content text, tokens int,
  embedding vector(768), created_at timestamptz
  index: ivfflat (embedding vector_cosine_ops) lists=100
  index: btree (article_id, chunk_index)
  RLS: company isolation (ίδιο pattern με kb_articles)

alter table kb_raw_sources
  + embedding vector(768)
  + embedded_at timestamptz

alter table secretary_memory
  + embedding vector(768)
  + embedded_at timestamptz

new table: ai_call_logs
  id uuid pk, company_id uuid, user_id uuid,
  function_name text, task_type text, model_used text,
  prompt_tokens int, completion_tokens int,
  latency_ms int, cost_estimate_usd numeric(10,6),
  success boolean, error_text text, created_at timestamptz
  index: (company_id, created_at desc)
  RLS: μόνο admins/owners της company βλέπουν

new RPC: match_kb_chunks(query_embedding, _company_id, match_count, threshold)
  → returns chunks ordered by 1 - (embedding <=> query_embedding) desc

new RPC: match_secretary_memories(query_embedding, _user_id, match_count, threshold)
```

---

## Νέα edge functions

### `embed-content`
- Input: `{ kind: 'kb_article'|'kb_source'|'memory', id: uuid }`.
- Φέρνει το text, chunk‑άρει αν χρειάζεται (~500 tokens με overlap 50), καλεί embeddings μέσω AI router → `google/text-embedding-004` (768d), upsert.
- Idempotent: αν `embedded_at >= updated_at` skip.

### `embed-backfill`
- Σαρώνει `kb_articles`, `kb_raw_sources`, `secretary_memory` της εταιρίας του χρήστη και καλεί `embed-content` σε batches (10 παράλληλα, με rate limit pacing).
- Επιστρέφει progress· καλείται από admin button.

### `ai-router` (shared module + thin function)
- Πραγματικό shared module: `supabase/functions/_shared/ai-router.ts` με:
  - `pickModel({ task_type, complexity, expects_vision, expects_long_context }) → model_id`
  - `callAI({ messages, task_type, ... })` wrapper που: επιλέγει μοντέλο, καλεί gateway, μετράει latency/tokens, γράφει `ai_call_logs`, χειρίζεται 429/402.
- Policy table (in‑code, εύκολα tweakable):

```text
classification, tagging, simple_extraction → google/gemini-2.5-flash-lite
generation, summarization, chat (default)  → google/gemini-3-flash-preview
reasoning, planning, brain_deep, code      → google/gemini-2.5-pro
multimodal_vision                          → google/gemini-2.5-pro
embeddings                                 → google/text-embedding-004
```

- Thin edge function `ai-router` εκθέτει POST endpoint για χρήσεις από client όταν χρειάζεται (π.χ. quick chat).

---

## Edge functions που τροποποιούνται

| Function | Αλλαγή |
|---|---|
| `kb-compiler` | `ask` action: embedding του query → `match_kb_chunks` → fallback FTS αν similarity<0.6. Compile: μετά την παραγωγή/ενημέρωση άρθρων, καλεί `embed-content` για κάθε νέο/updated. |
| `secretary-agent` | `recall_memory`: embedding του query → `match_secretary_memories` με fallback. `save_memory`: trigger embedding async. Wiki tools (`search_wiki`) → semantic. Όλες οι LLM κλήσεις περνούν από `callAI()`. |
| `quick-chat-gemini`, `chat-ai-assistant`, `my-work-ai-chat`, `notes-ai-action`, `ai-fill-form`, `ai-suggest-mapping`, `enrich-client`, `analyze-document`, `analyze-media-plan-excel`, `analyze-project-files`, `brain-analyze`, `brain-deep-analyze`, `smart-reschedule`, `smart-time-suggest`, `suggest-package`, `generate-media-plan`, `email-to-project` | Refactor σε `callAI({ task_type })` αντί για hardcoded fetch στο gateway. |

Όλα διατηρούν fallback path — αν ο router αποτύχει, default `gemini-3-flash-preview`.

---

## Frontend

- **Wiki Q&A (`useKBCompiler.askWiki`)** — δεν αλλάζει API surface, μόνο τα αποτελέσματα γίνονται πιο σχετικά. Προσθήκη badge «semantic match» στις πηγές.
- **Knowledge → Sources tab** — νέο button «Επαναφόρτωση embeddings» (admin only) που τρέχει `embed-backfill`.
- **`MemoryManager.tsx`** — μικρό indicator «✓ embedded» δίπλα σε κάθε εγγραφή.
- **Νέα σελίδα/tab `Settings → AI Usage`** (admin only):
  - Σύνολα requests / tokens / κόστος ανά μοντέλο, ανά function, ανά ημέρα (τελευταίες 30 ημέρες).
  - Πίνακας πρόσφατων κλήσεων με latency & success.
  - Charts με `recharts` (ήδη χρησιμοποιείται στο project).

---

## Backwards compatibility & risk

- Όλα additive. Παλιές κλήσεις χωρίς embeddings συνεχίζουν με FTS.
- Embedding backfill είναι opt‑in, idempotent, σε batches → δεν θα στραγγαλίσει το gateway.
- Αν `ai_call_logs` insert αποτύχει, δεν μπλοκάρει την κλήση (best‑effort).
- Δεν χρειάζονται νέα secrets — μόνο το ήδη‑υπάρχον `LOVABLE_API_KEY`.

---

## Σειρά εκτέλεσης

```text
1. Migration (pgvector + tables + RPCs + RLS)
2. _shared/ai-router.ts module
3. embed-content + embed-backfill edge functions
4. Refactor kb-compiler & secretary-agent (αυτά έχουν το μεγαλύτερο impact)
5. Refactor υπόλοιπων 15 edge functions να χρησιμοποιούν callAI
6. UI: backfill button + AI Usage tab
7. Smoke test: backfill σε υπάρχοντα data, Wiki query, Secretary recall
```

---

## Files (νέα/τροποποιημένα)

**Νέα:**
- `supabase/migrations/<timestamp>_phase1_phase3.sql`
- `supabase/functions/_shared/ai-router.ts`
- `supabase/functions/embed-content/index.ts`
- `supabase/functions/embed-backfill/index.ts`
- `supabase/functions/ai-router/index.ts`
- `src/pages/AIUsage.tsx` + route
- `src/hooks/useAIUsage.ts`
- `src/components/knowledge/EmbeddingsBackfillButton.tsx`

**Τροποποιημένα (refactor σε callAI):**
- `supabase/functions/kb-compiler/index.ts`
- `supabase/functions/secretary-agent/index.ts`
- `supabase/functions/{quick-chat-gemini, chat-ai-assistant, my-work-ai-chat, notes-ai-action, ai-fill-form, ai-suggest-mapping, enrich-client, analyze-document, analyze-media-plan-excel, analyze-project-files, brain-analyze, brain-deep-analyze, smart-reschedule, smart-time-suggest, suggest-package, generate-media-plan, email-to-project}/index.ts`
- `src/hooks/useKBCompiler.ts` (μικρό UI hint)
- `src/components/secretary/MemoryManager.tsx`

---

Πες ✅ για να προχωρήσω σε implementation με την παραπάνω σειρά.

