// Shared OAuth handlers used by both the standalone mcp-oauth-* functions
// AND by mcp-server (which exposes /register, /authorize, /token sub-paths
// so SDK clients that ignore the metadata's *_endpoint fields and instead
// derive URLs from {issuer}/<path> still work).

import { mcpCorsHeaders, adminClient, sha256Hex, randomToken, appBaseUrl } from "./mcp-auth.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CODE_TTL_SECONDS = 300;
const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;

// ----------------- REGISTER (RFC 7591) -----------------

export async function handleRegister(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: mcpCorsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: mcpCorsHeaders });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return jsonErr("invalid_client_metadata", undefined, 400);
  }

  const redirect_uris: string[] = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
  if (redirect_uris.length === 0) return jsonErr("invalid_redirect_uri", undefined, 400);

  const client_name: string = body.client_name ?? "Unknown MCP Client";
  const client_uri: string | null = body.client_uri ?? null;
  const logo_uri: string | null = body.logo_uri ?? null;
  const client_id = `mcp_${randomToken(16)}`;

  const admin = adminClient();
  const { error } = await admin.from("mcp_oauth_clients").insert({
    client_id, client_name, redirect_uris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    client_uri, logo_uri,
  });
  if (error) {
    console.error("DCR error", error);
    return jsonErr("server_error", error.message, 500);
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
}

// ----------------- AUTHORIZE -----------------

export async function handleAuthorize(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: mcpCorsHeaders });
  const url = new URL(req.url);

  if (req.method === "GET") {
    const params = url.searchParams;
    const required = ["client_id", "redirect_uri", "response_type", "code_challenge"];
    for (const k of required) {
      if (!params.get(k)) return new Response(`Missing required parameter: ${k}`, { status: 400 });
    }
    if (params.get("response_type") !== "code") {
      return new Response("Unsupported response_type", { status: 400 });
    }
    if ((params.get("code_challenge_method") ?? "S256") !== "S256") {
      return new Response("Only S256 PKCE is supported", { status: 400 });
    }

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

  if (req.method === "POST") {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return jsonErr("unauthenticated", undefined, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub) return jsonErr("invalid_token", undefined, 401);
    const userId = claims.claims.sub as string;

    let body: any;
    try { body = await req.json(); } catch { return jsonErr("invalid_request", undefined, 400); }
    const { client_id, redirect_uri, code_challenge, scopes, state } = body ?? {};
    if (!client_id || !redirect_uri || !code_challenge || !Array.isArray(scopes)) {
      return jsonErr("invalid_request", undefined, 400);
    }

    const admin = adminClient();
    const { data: client } = await admin.from("mcp_oauth_clients")
      .select("client_id, redirect_uris")
      .eq("client_id", client_id).maybeSingle();
    if (!client || !client.redirect_uris.includes(redirect_uri)) {
      return jsonErr("invalid_client", undefined, 400);
    }

    const { data: roleRow } = await admin.from("user_company_roles")
      .select("company_id").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle();
    if (!roleRow?.company_id) return jsonErr("no_active_company", undefined, 400);

    const code = randomToken(32);
    const codeHash = await sha256Hex(code);
    const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();

    const { error: insErr } = await admin.from("mcp_oauth_codes").insert({
      code_hash: codeHash,
      client_id, user_id: userId, company_id: roleRow.company_id,
      redirect_uri, scopes,
      code_challenge, code_challenge_method: "S256",
      expires_at: expiresAt,
    });
    if (insErr) {
      console.error("code insert", insErr);
      return jsonErr("server_error", undefined, 500);
    }

    const redirect = new URL(redirect_uri);
    redirect.searchParams.set("code", code);
    if (state) redirect.searchParams.set("state", state);

    return new Response(JSON.stringify({ redirect_url: redirect.toString() }), {
      headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405, headers: mcpCorsHeaders });
}

// ----------------- TOKEN -----------------

async function pkceVerify(verifier: string, challenge: string): Promise<boolean> {
  const buf = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const b64u = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return b64u === challenge;
}

async function readForm(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const j = await req.json();
    return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, String(v)]));
  }
  const form = await req.formData();
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) out[k] = String(v);
  return out;
}

export async function handleToken(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: mcpCorsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: mcpCorsHeaders });
  }

  const params = await readForm(req);
  const grant = params.grant_type;
  const admin = adminClient();

  if (grant === "authorization_code") {
    const { code, code_verifier, client_id, redirect_uri } = params;
    if (!code || !code_verifier || !client_id || !redirect_uri) return jsonErr("invalid_request");

    const codeHash = await sha256Hex(code);
    const { data: row } = await admin.from("mcp_oauth_codes")
      .select("*").eq("code_hash", codeHash).maybeSingle();
    if (!row) return jsonErr("invalid_grant");
    if (row.consumed_at) return jsonErr("invalid_grant", "code already used");
    if (new Date(row.expires_at).getTime() < Date.now()) return jsonErr("invalid_grant", "expired");
    if (row.client_id !== client_id) return jsonErr("invalid_grant");
    if (row.redirect_uri !== redirect_uri) return jsonErr("invalid_grant");
    if (!(await pkceVerify(code_verifier, row.code_challenge))) {
      return jsonErr("invalid_grant", "PKCE failed");
    }

    await admin.from("mcp_oauth_codes").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

    const access = randomToken(32);
    const refresh = randomToken(32);
    const accessHash = await sha256Hex(access);
    const refreshHash = await sha256Hex(refresh);
    const accessExp = new Date(Date.now() + ACCESS_TTL_SECONDS * 1000).toISOString();
    const refreshExp = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000).toISOString();

    const { error: insErr } = await admin.from("mcp_oauth_tokens").insert({
      access_token_hash: accessHash,
      refresh_token_hash: refreshHash,
      client_id: row.client_id, user_id: row.user_id, company_id: row.company_id,
      scopes: row.scopes,
      access_token_expires_at: accessExp,
      refresh_token_expires_at: refreshExp,
    });
    if (insErr) {
      console.error("token insert", insErr);
      return jsonErr("server_error", insErr.message);
    }

    return jsonOk({
      access_token: access, token_type: "Bearer",
      expires_in: ACCESS_TTL_SECONDS,
      refresh_token: refresh,
      scope: (row.scopes as string[]).join(" "),
    });
  }

  if (grant === "refresh_token") {
    const { refresh_token, client_id } = params;
    if (!refresh_token || !client_id) return jsonErr("invalid_request");

    const refreshHash = await sha256Hex(refresh_token);
    const { data: row } = await admin.from("mcp_oauth_tokens")
      .select("*").eq("refresh_token_hash", refreshHash).maybeSingle();
    if (!row) return jsonErr("invalid_grant");
    if (row.revoked_at) return jsonErr("invalid_grant");
    if (row.client_id !== client_id) return jsonErr("invalid_grant");
    if (row.refresh_token_expires_at && new Date(row.refresh_token_expires_at).getTime() < Date.now()) {
      return jsonErr("invalid_grant", "refresh expired");
    }

    const access = randomToken(32);
    const refresh = randomToken(32);
    const accessHash = await sha256Hex(access);
    const newRefreshHash = await sha256Hex(refresh);
    const accessExp = new Date(Date.now() + ACCESS_TTL_SECONDS * 1000).toISOString();
    const refreshExp = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000).toISOString();

    await admin.from("mcp_oauth_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", row.id);
    const { error: insErr } = await admin.from("mcp_oauth_tokens").insert({
      access_token_hash: accessHash,
      refresh_token_hash: newRefreshHash,
      client_id: row.client_id, user_id: row.user_id, company_id: row.company_id,
      scopes: row.scopes,
      access_token_expires_at: accessExp,
      refresh_token_expires_at: refreshExp,
    });
    if (insErr) return jsonErr("server_error", insErr.message);

    return jsonOk({
      access_token: access, token_type: "Bearer",
      expires_in: ACCESS_TTL_SECONDS,
      refresh_token: refresh,
      scope: (row.scopes as string[]).join(" "),
    });
  }

  return jsonErr("unsupported_grant_type");
}

// ----------------- helpers -----------------

function jsonOk(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { ...mcpCorsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
function jsonErr(code: string, desc?: string, status = 400) {
  return new Response(JSON.stringify({ error: code, error_description: desc }), {
    status, headers: { ...mcpCorsHeaders, "Content-Type": "application/json" },
  });
}
