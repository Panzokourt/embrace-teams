## Πρόβλημα

Ο επίσημος `@modelcontextprotocol/sdk` (που χρησιμοποιεί το `mcp-remote` και ο native connector του Claude.ai/Desktop) **αγνοεί** τα explicit endpoints (`registration_endpoint`, `authorization_endpoint`, `token_endpoint`) του OAuth metadata και κατασκευάζει τα URLs ως `{issuer}/register`, `{issuer}/authorize`, `{issuer}/token`.

Σήμερα ο issuer μας είναι `https://…/functions/v1/mcp-server`, οπότε ο SDK πάει:
- `POST .../mcp-server/register` → **401 unauthorized** (το mcp-server function δεν ξέρει αυτό το path)
- `GET .../mcp-server/authorize` → 401
- `POST .../mcp-server/token` → 401

Γι' αυτό το `mcp-remote` πεθαίνει με `Connection error: ServerError` στο `registerClient` (το `Discovered authorization server: …/mcp-server` δείχνει ότι το SDK θεωρεί ότι όλο το OAuth flow είναι κάτω από αυτό το base URL).

## Λύση

Στο `mcp-server/index.ts` προσθέτω routing για 3 sub-paths που εκτελούν την ίδια λογική με τα ξεχωριστά OAuth functions:

- `POST /mcp-server/register` → Dynamic Client Registration (αντιγραφή λογικής `mcp-oauth-register`)
- `GET /mcp-server/authorize` → redirect στη `/mcp-consent` σελίδα (αντιγραφή λογικής `mcp-oauth-authorize`)
- `POST /mcp-server/token` → token exchange & refresh (αντιγραφή λογικής `mcp-oauth-token`)

Τα standalone functions (`mcp-oauth-register`, `mcp-oauth-authorize`, `mcp-oauth-token`) παραμένουν για backwards compat με τους custom clients που σέβονται το metadata.

## Τεχνικές αλλαγές

### 1. `supabase/functions/_shared/mcp-oauth-handlers.ts` (νέο)

Εξάγει τις πραγματικές handler functions (`handleRegister(req)`, `handleAuthorize(req)`, `handleToken(req)`) από τα 3 υπάρχοντα oauth functions, ώστε να καλούνται και από τα ξεχωριστά functions και από το mcp-server.

### 2. `supabase/functions/mcp-server/index.ts` (επεξεργασία)

Στην αρχή του request handler, parse `new URL(req.url).pathname` και route:

```ts
const path = new URL(req.url).pathname;
if (path.endsWith("/register")) return handleRegister(req);
if (path.endsWith("/authorize")) return handleAuthorize(req);
if (path.endsWith("/token")) return handleToken(req);
// (αφήνουμε και το /.well-known/* όπως είναι σήμερα)
// fall through στο υπάρχον MCP JSON-RPC handling
```

### 3. `supabase/functions/mcp-oauth-register/index.ts`, `mcp-oauth-authorize/index.ts`, `mcp-oauth-token/index.ts` (refactor)

Κάθε ένα γίνεται thin wrapper:
```ts
import { handleRegister } from "../_shared/mcp-oauth-handlers.ts";
Deno.serve(handleRegister);
```

### 4. Ενημέρωση `mcp-oauth-metadata` & 401 responses (προαιρετικό)

Δεν χρειάζεται αλλαγή – τα URLs που επιστρέφονται παραμένουν σωστά για όσους τα σέβονται. Το νέο routing είναι απλώς fallback για τους SDKs που αγνοούν το metadata.

## Επαλήθευση

Μετά το deploy:
1. `curl -X POST .../mcp-server/register -d '{"redirect_uris":["http://127.0.0.1/cb"]}'` → 201 με `client_id`
2. Restart Claude Desktop με την ίδια config → πρέπει να ολοκληρωθεί OAuth flow
3. Δοκιμή και του native "Add custom connector" στο Claude.ai web – θα δουλέψει για τον ίδιο λόγο

## Εκτός scope

- Δεν αλλάζει τίποτα στο frontend (Settings → MCP Integration).
- Δεν χρειάζεται Cloudflare Worker ή νέο subdomain.
- Δεν αλλάζει η `claude_desktop_config.json` που έχεις ήδη.
