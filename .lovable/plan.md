

# Phase 5 · GraphRAG · Knowledge Graph Layer

**Στόχος:** Πάνω από τα ήδη relational δεδομένα (clients · projects · tasks · contacts · invoices · campaigns · kb_articles · secretary_memory) χτίζουμε ένα **knowledge graph** που επιτρέπει multi-hop ερωτήματα τύπου *"Δείξε όλες τις προτάσεις που σχετίζονται με πελάτες της κατηγορίας Retail που έχουν ληγμένο invoice"* — κάτι αδύνατο σήμερα με semantic search μόνο.

Ο agent (Secretary, Brain, Quick Chat) θα έχει νέα tools για graph traversal **πάνω από** το ήδη υπάρχον vector retrieval (Phase 1) — hybrid GraphRAG.

---

## Τι θα παραδοθεί

### 1. Graph schema (πάνω στη σχεσιακή βάση, χωρίς ETL χάος)

Δύο γενικοί πίνακες (entity-agnostic) με σαφές RLS ανά company:

- **`graph_nodes`**
  - `id uuid pk`
  - `company_id uuid` (RLS isolation)
  - `node_type text` enum-like: `client`, `project`, `task`, `contact`, `invoice`, `campaign`, `kb_article`, `media_plan`, `service`, `expense`, `episode`, `fact`
  - `entity_id uuid` (FK soft-link στον αντίστοιχο πίνακα)
  - `label text` (canonical name για graph display)
  - `properties jsonb` (κρίσιμα fields – status, value, dates – για filtering χωρίς joins)
  - `embedding vector(768)` (canonical text representation, για semantic node lookup)
  - `created_at, updated_at`
  - `unique(company_id, node_type, entity_id)`

- **`graph_edges`**
  - `id uuid pk`
  - `company_id uuid`
  - `source_node_id uuid fk`, `target_node_id uuid fk`
  - `relation_type text`: `belongs_to`, `assigned_to`, `manages`, `uses_service`, `has_invoice`, `references_kb`, `derived_from`, `mentions`, `worked_on`, `parent_of`, `tagged_as`
  - `weight numeric` (0-1, για ranking)
  - `metadata jsonb` (π.χ. `{ since: ..., role: ... }`)
  - `created_at`
  - `unique(source_node_id, target_node_id, relation_type)`

- **Indexes:** btree στα `(company_id, node_type)`, `(source_node_id, relation_type)`, `(target_node_id, relation_type)`, GIN στο `properties`, IVFFlat στο `embedding`.
- **RLS:** Strict company isolation με τα ίδια helper functions που ήδη έχουμε.

### 2. Sync layer · κρατάμε το graph "alive"

- **DB triggers** σε ~12 βασικούς πίνακες (`projects`, `tasks`, `clients`, `contacts`, `invoices`, `campaigns`, `kb_articles`, `media_plans`, `services`, `expenses`, `client_user_access`, `project_user_access`):
  - On `INSERT/UPDATE`: `upsert_graph_node()` (canonical label + properties).
  - On `DELETE`: cascade αφαίρεση.
- **Edge inference function** `rebuild_graph_edges_for_entity(node_id)`:
  - Παράγει τα `graph_edges` βάσει FKs (π.χ. `task.project_id → project.client_id → client`) — όχι ad-hoc, αλλά declarative mapping.
- **Embeddings backfill:** Νέο action `graph` στο υπάρχον `embed-backfill` που πιάνει nodes χωρίς embedding (canonical text = `label + key properties`).
- **Initial seed migration:** One-time INSERT για όλα τα υπάρχοντα entities της εκάστοτε εταιρίας.

### 3. Νέο edge function · `graph-query`

Endpoint για graph traversal:

```
POST /functions/v1/graph-query
{
  action: 'neighbors' | 'shortest_path' | 'subgraph_for_query' | 'find_related',
  start_entity?: { type, id },
  query?: string,            // για semantic anchor
  max_hops?: 1..3,
  filters?: {
    node_types?: string[],
    relation_types?: string[],
    properties?: Record<string, any>
  },
  limit?: number
}
```

- **`subgraph_for_query`** (ο πραγματικά νέος hybrid mode):
  1. Embed το query.
  2. Top-k node lookup μέσω vector similarity (`match_graph_nodes` RPC) — anchors.
  3. BFS traversal 1-3 hops από κάθε anchor με relation_type filtering.
  4. Επιστρέφει subgraph + ranked nodes (score = vector_sim × hop_decay × edge_weight).
- Όλα μέσω **PL/pgSQL recursive CTEs** για περιορισμό round-trips.

### 4. Integration στους AI agents

- **Νέα tools για `secretary-agent`:**
  - `graph_neighbors({ entity_type, entity_id, hops, relation_types? })` — άμεσο context.
  - `graph_search({ query, focus_types? })` — hybrid GraphRAG anchor + traversal.
  - `graph_path({ from_entity, to_entity })` — π.χ. "πώς συνδέεται ο πελάτης Χ με το έργο Υ;".
- **`brain-deep-analyze` refactor:** Πριν καλέσει το LLM, τραβάει subgraph γύρω από το target entity (3 hops) και το δίνει ως structured context στο prompt — αντικαθιστά τα current ad-hoc joins.
- **`kb-compiler` (action `ask`):** Αν το hybrid retrieval (vector + FTS) επιστρέψει < N hits, fallback σε `subgraph_for_query` για να βρει σχετικά entities που δεν είναι αμιγώς "documents".

### 5. UI · Graph Explorer (admin/power-user)

- Νέα σελίδα **`/knowledge?tab=graph`** (νέο tab δίπλα στο Wiki/Blueprints/Ask/Manage) με:
  - **Force-directed graph view** μέσω `react-force-graph-2d` (lightweight, ήδη γνωστό).
  - Filters: node types, relation types, depth.
  - Click σε node → detail panel με properties + neighbors + deep-link στο entity (π.χ. `/projects/:id`).
  - Search bar που τρέχει `subgraph_for_query` και κεντράρει.
- Mini graph widget στη σελίδα κάθε project/client (`ProjectDetail`, `ClientDetail`) — **"Related entities (graph)"** card.

### 6. Observability

- Logs στο `ai_call_logs` με `function_name='graph-query'`, `task_type='graph_traversal'`, latency tracking.
- Νέο view `graph_health_summary`: counts ανά node_type, edges ανά relation_type, % nodes χωρίς embedding.
- Health Check tab στο Knowledge → Manage να δείχνει graph stats.

---

## Database changes (migration)

```text
extensions: pgvector (already enabled)

new table: graph_nodes (RLS by company_id)
new table: graph_edges (RLS by company_id)

new functions:
  upsert_graph_node(_company_id, _node_type, _entity_id, _label, _props) → uuid
  rebuild_graph_edges_for_entity(_node_id) → void
  match_graph_nodes(query_embedding, _company_id, _node_types, match_count, threshold)
    → table(node_id, node_type, entity_id, label, similarity)
  graph_neighbors(_node_id, _hops, _relation_types, _max_results)
    → table(node_id, distance, path)
  graph_subgraph_for_query(query_embedding, _company_id, _max_hops, _anchor_count)
    → table(node_id, anchor_id, distance, score)

new triggers:
  trg_sync_graph_<table>_iud on projects, tasks, clients, contacts, invoices,
  campaigns, kb_articles, media_plans, services, expenses

initial backfill: INSERT INTO graph_nodes ... per company (idempotent)
```

---

## Νέα/Τροποποιημένα αρχεία

**Νέα:**
- `supabase/migrations/...phase5_graphrag.sql` (μεγάλο – schema + triggers + RPCs + initial backfill)
- `supabase/functions/graph-query/index.ts`
- `src/components/knowledge/GraphExplorer.tsx` (force-directed view + filters)
- `src/components/knowledge/GraphNodeDetail.tsx` (side panel)
- `src/components/shared/RelatedEntitiesCard.tsx` (mini widget για detail pages)
- `src/hooks/useKnowledgeGraph.ts` (React Query wrapper)

**Modified:**
- `supabase/functions/_shared/ai-router.ts` (add `task_type: 'graph_reasoning'`)
- `supabase/functions/secretary-agent/index.ts` (3 νέα tools)
- `supabase/functions/brain-deep-analyze/index.ts` (subgraph context injection)
- `supabase/functions/kb-compiler/index.ts` (fallback σε graph query)
- `supabase/functions/embed-backfill/index.ts` (action `graph`)
- `src/pages/Knowledge.tsx` (νέο tab `graph`)
- `src/pages/ProjectDetail.tsx`, `src/pages/ClientDetail.tsx` (RelatedEntitiesCard)

**Dependency:** `react-force-graph-2d` + `d3-force` (μικρά, ~80kb gzipped).

---

## Σειρά υλοποίησης

1. Migration: schema + RPCs + triggers + initial backfill (1 call, με approval).
2. `graph-query` edge function + embedding του graph nodes μέσω `embed-backfill`.
3. Refactor `secretary-agent` + `brain-deep-analyze` + `kb-compiler` για graph tools.
4. UI: Graph Explorer tab στο Knowledge + RelatedEntitiesCard στα detail pages.
5. Health stats integration.

---

Πες ✅ για να προχωρήσω σε implementation. Αν θέλεις να αφαιρέσουμε ή να συμπτύξουμε κάτι (π.χ. χωρίς force-directed UI για ταχύτητα), πες μου τώρα.

