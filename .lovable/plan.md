

# LLM Knowledge Compiler — Ενσωμάτωση στο υπάρχον Knowledge Base

## Τι φτιάχνουμε

Ενσωματώνουμε το Karpathy "LLM Knowledge Base" pattern στο υπάρχον KB. Ο χρήστης φορτώνει πηγές (κείμενα, URLs, PDFs), το AI τις "μεταγλωττίζει" σε δομημένα kb_articles με backlinks και cross-references. Αντί RAG, το wiki είναι ένα persistent artifact που μεγαλώνει σταδιακά.

## Αρχιτεκτονική

```text
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Raw Sources │ ──► │ kb-compiler      │ ──► │ kb_articles      │
│ (νέος table)│     │ (edge function)  │     │ (υπάρχον)        │
└─────────────┘     │ Gemini 2.5 Pro   │     ├──────────────────┤
                    └──────────────────┘     │ kb_article_links │
                           ▲                │ (νέος table)     │
                           │                └──────────────────┘
                    ┌──────┴──────┐
                    │ Ask / Health│
                    │ endpoints   │
                    └─────────────┘
```

## Database — 2 νέοι πίνακες

### `kb_raw_sources`
- `id` uuid PK
- `company_id` uuid FK
- `user_id` uuid FK (who uploaded)
- `title` text
- `content` text (plain text / markdown)
- `source_type` text (`article` | `pdf` | `note` | `url`)
- `url` text nullable
- `compiled` boolean default false
- `compiled_at` timestamptz nullable
- `created_at` timestamptz

### `kb_article_links`
- `id` uuid PK
- `from_article_id` uuid FK → kb_articles
- `to_article_id` uuid FK → kb_articles
- `company_id` uuid FK

RLS: company-scoped read/write for authenticated users.

## Edge Function — `kb-compiler`

Ένα edge function με 3 actions, χρησιμοποιεί **Gemini 2.5 Pro** μέσω Lovable AI Gateway:

### Action: `compile`
- Input: raw source content + υπάρχοντα kb_articles (slug, title, snippet)
- Prompt: "Αναλύεις νέα πηγή, επιστρέφεις JSON με update_pages, create_pages, new_links"
- Tool calling schema για structured output
- Εκτελεί τα updates/creates στα kb_articles και kb_article_links

### Action: `ask`
- Input: ερώτηση χρήστη + όλα τα kb_articles ως context
- Streaming response με citations σε wiki pages
- Κουμπί "Save to Wiki" στο frontend

### Action: `health`
- Input: όλα τα kb_articles
- Tool calling → JSON: contradictions, orphan_pages, missing_concepts, suggested_articles
- Non-streaming response

## UI Changes

### Knowledge.tsx — 3 νέα tabs
- **📥 Sources**: Upload/paste πηγές, λίστα raw sources, κουμπί "Compile into Wiki" ανά source
- **❓ Ask Wiki**: Chat interface — ερώτηση → streaming AI απάντηση με citations → "Save to Wiki" button
- **🔍 Health Check**: Κουμπί "Run Lint", αποτελέσματα σε λίστα με proposed fixes

### KnowledgeArticle.tsx
- **Backlinks section**: Κάτω από το content, εμφανίζει ποια articles κάνουν link σε αυτό
- **Wiki links**: Τα `[[slug]]` στο markdown γίνονται clickable links (custom ReactMarkdown component)
- **Word count**: Εμφάνιση αριθμού λέξεων στο sidebar

### Stats bar update
- Dashboard KPI: + Raw Sources count, + Total Words, + Orphan pages

## Νέα Components

| Component | Περιγραφή |
|-----------|-----------|
| `KBSourceUploader.tsx` | Form: paste text/URL, upload file, τίτλος |
| `KBSourceList.tsx` | Λίστα raw sources με status (compiled/pending) |
| `KBAskChat.tsx` | Chat interface: input + streaming response + citations + "Save to Wiki" |
| `KBHealthCheck.tsx` | Run lint button + αποτελέσματα (contradictions, orphans, missing) |
| `KBBacklinks.tsx` | Λίστα articles που κάνουν link σε ένα article |

## Νέο Hook

### `useKBCompiler.ts`
- `compileSources(sourceId)` → calls edge function action=compile
- `askWiki(question)` → streaming call action=ask
- `runHealthCheck()` → call action=health
- `rawSources` query + `createSource` mutation

## Files

| File | Αλλαγή |
|------|--------|
| Migration | 2 tables: `kb_raw_sources`, `kb_article_links` + RLS |
| `supabase/functions/kb-compiler/index.ts` | Νέο — compile/ask/health via Gemini 2.5 Pro |
| `src/hooks/useKBCompiler.ts` | Νέο — sources CRUD, compile, ask (streaming), health |
| `src/pages/Knowledge.tsx` | +3 tabs: Sources, Ask Wiki, Health Check |
| `src/pages/KnowledgeArticle.tsx` | Backlinks section, wiki link rendering, word count |
| `src/components/knowledge/KBSourceUploader.tsx` | Νέο — upload/paste form |
| `src/components/knowledge/KBSourceList.tsx` | Νέο — sources list with compile button |
| `src/components/knowledge/KBAskChat.tsx` | Νέο — chat interface with streaming |
| `src/components/knowledge/KBHealthCheck.tsx` | Νέο — lint results UI |
| `src/components/knowledge/KBBacklinks.tsx` | Νέο — backlinks list |

