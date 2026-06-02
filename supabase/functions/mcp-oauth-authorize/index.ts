// Thin wrapper — see _shared/mcp-oauth-handlers.ts
import { handleAuthorize } from "../_shared/mcp-oauth-handlers.ts";
Deno.serve(handleAuthorize);
