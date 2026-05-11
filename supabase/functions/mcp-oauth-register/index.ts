// Dynamic Client Registration (RFC 7591) — public endpoint.
// Allows MCP clients (Claude Desktop, Cursor, etc.) to self-register.
import { mcpCorsHeaders, adminClient, randomToken } from "../_shared/mcp-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: mcpCorsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: mcpCorsHeaders });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_client_metadata" }), {
      status: 400, headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
    });
  }

  const redirect_uris: string[] = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
  if (redirect_uris.length === 0) {
    return new Response(JSON.stringify({ error: "invalid_redirect_uri" }), {
      status: 400, headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
    });
  }
  const client_name: string = body.client_name ?? "Unknown MCP Client";
  const client_uri: string | null = body.client_uri ?? null;
  const logo_uri: string | null = body.logo_uri ?? null;

  const client_id = `mcp_${randomToken(16)}`;

  const admin = adminClient();
  const { error } = await admin.from("mcp_oauth_clients").insert({
    client_id,
    client_name,
    redirect_uris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    client_uri, logo_uri,
  });
  if (error) {
    console.error("DCR error", error);
    return new Response(JSON.stringify({ error: "server_error", error_description: error.message }), {
      status: 500, headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    client_id,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name,
    redirect_uris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  }), {
    status: 201,
    headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
  });
});
