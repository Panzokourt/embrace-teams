// OAuth Authorization Server Metadata (RFC 8414)
// Served at /functions/v1/mcp-oauth-metadata so MCP clients can discover endpoints.
import { mcpCorsHeaders, publicBaseUrl } from "../_shared/mcp-auth.ts";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: mcpCorsHeaders });
  const base = publicBaseUrl();
  const meta = {
    issuer: base,
    authorization_endpoint: `${base}/mcp-oauth-authorize`,
    token_endpoint: `${base}/mcp-oauth-token`,
    registration_endpoint: `${base}/mcp-oauth-register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [
      "tasks:read", "tasks:write",
      "projects:read", "clients:read",
      "time:read", "time:write",
      "kb:read",
    ],
  };
  return new Response(JSON.stringify(meta), {
    headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
  });
});
