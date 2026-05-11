// OAuth Authorize endpoint.
// GET → redirects to in-app consent screen with the OAuth params preserved.
// POST (called by the consent screen with a logged-in user JWT) → issues an authorization code
//      and returns the redirect URL for the MCP client.

import { mcpCorsHeaders, adminClient, sha256Hex, randomToken, appBaseUrl } from "../_shared/mcp-auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CODE_TTL_SECONDS = 300;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: mcpCorsHeaders });

  const url = new URL(req.url);

  // -------- GET → redirect to consent screen --------
  if (req.method === "GET") {
    const params = url.searchParams;
    const required = ["client_id", "redirect_uri", "response_type", "code_challenge"];
    for (const k of required) {
      if (!params.get(k)) {
        return new Response(`Missing required parameter: ${k}`, { status: 400 });
      }
    }
    if (params.get("response_type") !== "code") {
      return new Response("Unsupported response_type", { status: 400 });
    }
    if ((params.get("code_challenge_method") ?? "S256") !== "S256") {
      return new Response("Only S256 PKCE is supported", { status: 400 });
    }

    // Validate client + redirect_uri
    const admin = adminClient();
    const { data: client } = await admin.from("mcp_oauth_clients")
      .select("client_id, redirect_uris, client_name")
      .eq("client_id", params.get("client_id"))
      .maybeSingle();
    if (!client) return new Response("Unknown client", { status: 400 });
    const redirectUri = params.get("redirect_uri")!;
    if (!client.redirect_uris.includes(redirectUri)) {
      return new Response("redirect_uri not registered for client", { status: 400 });
    }

    const consent = new URL(`${appBaseUrl()}/mcp/consent`);
    for (const [k, v] of params) consent.searchParams.set(k, v);
    return Response.redirect(consent.toString(), 302);
  }

  // -------- POST → issue authorization code (called by the in-app consent screen) --------
  if (req.method === "POST") {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401, headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user JWT
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401, headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    let body: any;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "invalid_request" }), {
        status: 400, headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
      });
    }
    const { client_id, redirect_uri, code_challenge, scopes, state } = body ?? {};
    if (!client_id || !redirect_uri || !code_challenge || !Array.isArray(scopes)) {
      return new Response(JSON.stringify({ error: "invalid_request" }), {
        status: 400, headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = adminClient();
    const { data: client } = await admin.from("mcp_oauth_clients")
      .select("client_id, redirect_uris")
      .eq("client_id", client_id).maybeSingle();
    if (!client || !client.redirect_uris.includes(redirect_uri)) {
      return new Response(JSON.stringify({ error: "invalid_client" }), {
        status: 400, headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick user's company
    const { data: roleRow } = await admin.from("user_company_roles")
      .select("company_id").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle();
    if (!roleRow?.company_id) {
      return new Response(JSON.stringify({ error: "no_active_company" }), {
        status: 400, headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = randomToken(32);
    const codeHash = await sha256Hex(code);
    const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();

    const { error: insErr } = await admin.from("mcp_oauth_codes").insert({
      code_hash: codeHash,
      client_id,
      user_id: userId,
      company_id: roleRow.company_id,
      redirect_uri,
      scopes,
      code_challenge,
      code_challenge_method: "S256",
      expires_at: expiresAt,
    });
    if (insErr) {
      console.error("code insert", insErr);
      return new Response(JSON.stringify({ error: "server_error" }), {
        status: 500, headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
      });
    }

    const redirect = new URL(redirect_uri);
    redirect.searchParams.set("code", code);
    if (state) redirect.searchParams.set("state", state);

    return new Response(JSON.stringify({ redirect_url: redirect.toString() }), {
      headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405, headers: mcpCorsHeaders });
});
