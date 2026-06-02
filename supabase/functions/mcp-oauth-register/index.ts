// Thin wrapper — see _shared/mcp-oauth-handlers.ts
import { handleRegister } from "../_shared/mcp-oauth-handlers.ts";
Deno.serve(handleRegister);
