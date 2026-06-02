// Thin wrapper — see _shared/mcp-oauth-handlers.ts
import { handleToken } from "../_shared/mcp-oauth-handlers.ts";
Deno.serve(handleToken);
