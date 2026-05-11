# MCP Server για το Olseny Workspace

Δημιουργία ενός full-featured **Model Context Protocol (MCP) Server** που εκθέτει τα δεδομένα και τις λειτουργίες της εφαρμογής σε:
- **Εξωτερικούς AI clients** (Claude Desktop, ChatGPT Desktop, Cursor, Windsurf, κλπ.)
- **Τον εσωτερικό Secretary agent** (μέσω του ίδιου protocol για consistency)

## Αρχιτεκτονική

```text
┌─────────────────────┐         ┌──────────────────────┐
│  External Client    │  HTTPS  │   Edge Function      │
│  (Claude Desktop)   │ ──────► │   /mcp-server        │
└─────────────────────┘         │   (Streamable HTTP)  │
                                │                      │
┌─────────────────────┐         │   - OAuth 2.0        │
│  Secretary Agent    │ ──────► │   - Tool registry    │
│  (in-app)           │         │   - Company-scoped   │
└─────────────────────┘         └──────────┬───────────┘
                                           │
                                ┌──────────▼───────────┐
                                │  Supabase (RLS +     │
                                │  service-role calls) │
                                └──────────────────────┘
```

## Τι θα φτιάξουμε

### 1. Database (νέα tables)
- `mcp_oauth_clients` — registered MCP clients (client_id, client_secret_hash, redirect_uris, name, owner)
- `mcp_oauth_codes` — short-lived authorization codes (PKCE)
- `mcp_oauth_tokens` — access + refresh tokens, scoped σε `user_id` + `company_id` + `scopes[]`
- `mcp_audit_log` — κάθε tool call (user, tool, args summary, result status, timestamp)

Όλα company-scoped με RLS και αυστηρό `SET search_path = public`.

### 2. Edge Functions
Νέες functions στο `supabase/functions/`:

| Function | Σκοπός |
|---|---|
| `mcp-server` | Κύριο endpoint — Streamable HTTP MCP transport (mcp-lite + Hono). `verify_jwt = false` (κάνει δικό του token validation). |
| `mcp-oauth-authorize` | OAuth authorize endpoint — δείχνει consent screen, redirect στον δικό μας UI |
| `mcp-oauth-token` | OAuth token endpoint — exchange code → tokens, refresh |
| `mcp-oauth-register` | Dynamic Client Registration (RFC 7591) — έτσι Claude Desktop κλπ συνδέονται αυτόματα |
| `.well-known/oauth-authorization-server` | Discovery metadata (μέσω rewrite στο `mcp-server`) |

### 3. MCP Tools (αρχικό set)

**Tasks**
- `list_tasks` (filters: status, priority, assigned_to_me, due_within_days)
- `get_task` (id)
- `create_task` (title, project_id, priority, due_date, description)
- `update_task` (id, status, priority, due_date, etc.)
- `complete_task` (id)

**Projects & Clients (read)**
- `list_projects` (filters: status, client_id)
- `get_project` (id, includes basic stats)
- `list_clients`
- `get_client` (id, με contacts)

**Time tracking**
- `start_timer` (task_id, description)
- `stop_timer` (επιστρέφει duration)
- `get_active_timer`
- `log_time_entry` (task_id, started_at, duration_minutes, description)

**Knowledge Base**
- `search_kb` (query) — semantic search μέσω του υπάρχοντος `match_kb_chunks`
- `get_kb_article` (id)
- `list_blueprints`

Κάθε tool εκτελείται με τα δικαιώματα του `user_id` του token (μέσω `auth.uid()` simulation με service role + manual scoping στις queries — όχι παράκαμψη RLS).

### 4. UI: Σελίδα διαχείρισης MCP
Νέο route `/settings/integrations/mcp`:
- Λίστα συνδεδεμένων MCP clients ανά χρήστη
- Κουμπί "Revoke access"
- Οδηγίες σύνδεσης για Claude Desktop / Cursor (με το server URL: `https://qsykyiqplslvmxdfudxq.supabase.co/functions/v1/mcp-server`)
- Audit log viewer (πρόσφατες κλήσεις)

### 5. Internal usage
Ο `secretary-agent` Edge Function θα μπορεί να καλεί τα ίδια tools απευθείας (in-process import), ώστε ο Secretary και οι external clients να μοιράζονται την ίδια λογική.

## OAuth Flow (περίληψη)

1. Claude Desktop κάνει discovery στο `/.well-known/oauth-authorization-server`
2. Dynamic Client Registration → επιστρέφει `client_id`
3. Browser ανοίγει στον authorize endpoint → ο χρήστης κάνει login (αν χρειάζεται) → consent screen
4. Code + PKCE → exchange στο token endpoint → access + refresh token
5. Όλες οι MCP requests έρχονται με `Authorization: Bearer <access_token>`

## Τεχνικές επιλογές
- **Library**: `mcp-lite` (npm) σε Deno Edge Function με Hono routing
- **Token format**: opaque random tokens (όχι JWT) — αποθηκεύονται hashed στη DB για άμεσο revocation
- **Scopes**: `tasks:read`, `tasks:write`, `projects:read`, `clients:read`, `time:write`, `kb:read` — ο χρήστης τα επιλέγει στο consent screen
- **Rate limiting**: per-token (π.χ. 60 req/min) μέσω in-memory map ή `mcp_audit_log` count
- **Audit**: κάθε call γράφεται στο `mcp_audit_log` για compliance

## Ασφάλεια
- Tokens hashed με sha256 πριν αποθηκευτούν (όπως ήδη κάνεις στα portal tokens με `_hash_token`)
- Όλες οι queries scoped σε `user_id` + `company_id` του token — ποτέ cross-tenant
- PKCE υποχρεωτικό (RFC 7636)
- Refresh token rotation
- Tools που γράφουν δεδομένα (create_task, log_time_entry) απαιτούν explicit `*:write` scope

## Παραδοτέα μετά την υλοποίηση
1. 4 νέες tables + RLS policies
2. 4 νέες Edge Functions
3. Σελίδα διαχείρισης στο Settings με connection instructions
4. Documentation block μέσα στη σελίδα για copy-paste config σε Claude/Cursor
5. Refactor του `secretary-agent` ώστε να καλεί τα MCP tools (optional follow-up)

## Σημειώσεις
- **Δεν χρειάζεται κανένα API key/secret** από εσένα — όλα τρέχουν στο Lovable Cloud
- Το MCP server URL θα είναι σταθερό και δημόσια προσβάσιμο, αλλά κάθε call απαιτεί valid OAuth token
- Αρχικά **δεν** ενσωματώνουμε στον Secretary (κρατάμε το ως follow-up step) για να περιορίσουμε το scope της πρώτης υλοποίησης

Θες να προχωρήσουμε; Αν ναι, πάτα **Implement plan**.