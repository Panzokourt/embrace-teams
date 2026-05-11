// MCP Server (Streamable HTTP transport, JSON-RPC 2.0).
// Public endpoint at /functions/v1/mcp-server.
// Auth: Bearer access token from /mcp-oauth-token.
//
// Discovery:
//   GET /mcp-server/.well-known/oauth-authorization-server  →  metadata
//   POST /mcp-server                                         →  JSON-RPC

import { mcpCorsHeaders, adminClient, validateAccessToken, hasScope, publicBaseUrl, type McpTokenContext } from "../_shared/mcp-auth.ts";
import { ALL_TOOLS } from "../_shared/mcp-tools.ts";

const PROTOCOL_VERSION = "2025-03-26";
const SERVER_INFO = { name: "olseny-mcp-server", version: "1.0.0" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: mcpCorsHeaders });
  const url = new URL(req.url);

  // ---- OAuth metadata discovery (RFC 9728 + 8414) ----
  if (url.pathname.endsWith("/.well-known/oauth-authorization-server") ||
      url.pathname.endsWith("/.well-known/oauth-protected-resource")) {
    const base = publicBaseUrl();
    const resourceUrl = `${base}/mcp-server`;
    const meta = url.pathname.endsWith("oauth-protected-resource")
      ? {
          resource: resourceUrl,
          // The same /mcp-server URL also serves /.well-known/oauth-authorization-server
          authorization_servers: [resourceUrl],
          bearer_methods_supported: ["header"],
          scopes_supported: [
            "tasks:read","tasks:write","projects:read","clients:read",
            "time:read","time:write","kb:read",
          ],
        }
      : {
          issuer: resourceUrl,
          authorization_endpoint: `${base}/mcp-oauth-authorize`,
          token_endpoint: `${base}/mcp-oauth-token`,
          registration_endpoint: `${base}/mcp-oauth-register`,
          response_types_supported: ["code"],
          grant_types_supported: ["authorization_code", "refresh_token"],
          code_challenge_methods_supported: ["S256"],
          token_endpoint_auth_methods_supported: ["none"],
          scopes_supported: [
            "tasks:read","tasks:write","projects:read","clients:read",
            "time:read","time:write","kb:read",
          ],
        };
    return new Response(JSON.stringify(meta), {
      headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method === "GET") {
    return unauthorized();
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: mcpCorsHeaders });
  }

  // ---- Auth ----
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return unauthorized();
  }
  const admin = adminClient();
  const ctx = await validateAccessToken(authHeader.slice(7), admin);
  if (!ctx) return unauthorized();

  // ---- JSON-RPC ----
  let body: any;
  try { body = await req.json(); } catch {
    return rpcError(null, -32700, "Parse error");
  }

  // Batch
  const requests = Array.isArray(body) ? body : [body];
  const responses: any[] = [];
  for (const r of requests) {
    const resp = await handleRpc(r, ctx, admin, req);
    if (resp !== null) responses.push(resp);
  }
  if (responses.length === 0) {
    return new Response(null, { status: 202, headers: mcpCorsHeaders });
  }
  const out = Array.isArray(body) ? responses : responses[0];
  return new Response(JSON.stringify(out), {
    headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
  });
});

async function handleRpc(req: any, ctx: McpTokenContext, admin: any, http: Request): Promise<any> {
  const { id = null, method, params = {} } = req ?? {};
  if (typeof method !== "string") {
    return { jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid Request" } };
  }

  // Notifications (no id) → no response
  const isNotification = id === undefined || id === null;

  try {
    switch (method) {
      case "initialize":
        return ok(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
        });

      case "notifications/initialized":
        return null;

      case "ping":
        return ok(id, {});

      case "tools/list": {
        const tools = ALL_TOOLS
          .filter((t) => hasScope(ctx, t.requiredScope))
          .map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          }));
        return ok(id, { tools });
      }

      case "tools/call": {
        const name: string = params?.name;
        const args = params?.arguments ?? {};
        const tool = ALL_TOOLS.find((t) => t.name === name);
        if (!tool) {
          return ok(id, { isError: true, content: [{ type: "text", text: `Unknown tool: ${name}` }] });
        }
        if (!hasScope(ctx, tool.requiredScope)) {
          await audit(admin, ctx, name, args, "denied", `missing scope ${tool.requiredScope}`, 0);
          return ok(id, { isError: true, content: [{ type: "text", text: `Scope ${tool.requiredScope} required` }] });
        }
        const start = Date.now();
        try {
          const result = await tool.handler(args, ctx, admin);
          await audit(admin, ctx, name, args, "success", null, Date.now() - start);
          return ok(id, result);
        } catch (e: any) {
          await audit(admin, ctx, name, args, "error", e?.message ?? "unknown", Date.now() - start);
          return ok(id, { isError: true, content: [{ type: "text", text: e?.message ?? "Tool error" }] });
        }
      }

      default:
        if (isNotification) return null;
        return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
    }
  } catch (e: any) {
    if (isNotification) return null;
    return { jsonrpc: "2.0", id, error: { code: -32603, message: e?.message ?? "Internal error" } };
  }
}

function ok(id: any, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function unauthorized() {
  const base = publicBaseUrl();
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      ...mcpCorsHeaders,
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer realm="MCP", resource_metadata="${base}/mcp-server/.well-known/oauth-protected-resource"`,
    },
  });
}

function rpcError(id: any, code: number, message: string) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), {
    headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
  });
}

async function audit(admin: any, ctx: McpTokenContext, tool: string, args: any, status: string, error: string | null, ms: number) {
  try {
    const summary = (() => {
      try { return JSON.parse(JSON.stringify(args).slice(0, 1000)); } catch { return null; }
    })();
    await admin.from("mcp_audit_log").insert({
      user_id: ctx.userId,
      company_id: ctx.companyId,
      client_id: ctx.clientId,
      token_id: ctx.tokenId,
      tool_name: tool,
      args_summary: summary,
      status,
      error_message: error,
      duration_ms: ms,
    });
  } catch { /* swallow */ }
}
