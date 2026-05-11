// OAuth Token endpoint — exchanges authorization codes (with PKCE) for access+refresh tokens,
// and refreshes existing tokens.
import { mcpCorsHeaders, adminClient, sha256Hex, randomToken } from "../_shared/mcp-auth.ts";

const ACCESS_TTL_SECONDS = 60 * 60;          // 1 hour
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: mcpCorsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: mcpCorsHeaders });
  }

  const params = await readForm(req);
  const grant = params.grant_type;
  const admin = adminClient();

  if (grant === "authorization_code") {
    const { code, code_verifier, client_id, redirect_uri } = params;
    if (!code || !code_verifier || !client_id || !redirect_uri) {
      return jsonErr("invalid_request");
    }

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

    // mark consumed
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
      client_id: row.client_id,
      user_id: row.user_id,
      company_id: row.company_id,
      scopes: row.scopes,
      access_token_expires_at: accessExp,
      refresh_token_expires_at: refreshExp,
    });
    if (insErr) {
      console.error("token insert", insErr);
      return jsonErr("server_error", insErr.message);
    }

    return jsonOk({
      access_token: access,
      token_type: "Bearer",
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

    // Rotate: revoke old, issue new
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
      client_id: row.client_id,
      user_id: row.user_id,
      company_id: row.company_id,
      scopes: row.scopes,
      access_token_expires_at: accessExp,
      refresh_token_expires_at: refreshExp,
    });
    if (insErr) return jsonErr("server_error", insErr.message);

    return jsonOk({
      access_token: access,
      token_type: "Bearer",
      expires_in: ACCESS_TTL_SECONDS,
      refresh_token: refresh,
      scope: (row.scopes as string[]).join(" "),
    });
  }

  return jsonErr("unsupported_grant_type");
});

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
