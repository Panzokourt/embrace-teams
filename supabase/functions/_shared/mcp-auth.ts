// Shared MCP OAuth helpers
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export const mcpCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, mcp-session-id, mcp-protocol-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Expose-Headers": "mcp-session-id, www-authenticate",
};

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  // base64url
  return btoa(String.fromCharCode(...arr))
    .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export interface McpTokenContext {
  tokenId: string;
  userId: string;
  companyId: string;
  scopes: string[];
  clientId: string;
}

export async function validateAccessToken(
  accessToken: string,
  admin: SupabaseClient,
): Promise<McpTokenContext | null> {
  const hash = await sha256Hex(accessToken);
  const { data, error } = await admin
    .from("mcp_oauth_tokens")
    .select("id, user_id, company_id, scopes, client_id, access_token_expires_at, revoked_at")
    .eq("access_token_hash", hash)
    .maybeSingle();
  if (error || !data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.access_token_expires_at).getTime() < Date.now()) return null;

  // touch last_used_at (fire and forget)
  admin.from("mcp_oauth_tokens").update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id).then(() => {});

  return {
    tokenId: data.id,
    userId: data.user_id,
    companyId: data.company_id,
    scopes: data.scopes ?? [],
    clientId: data.client_id,
  };
}

export function hasScope(ctx: McpTokenContext, scope: string): boolean {
  return ctx.scopes.includes(scope);
}

export function publicBaseUrl(): string {
  // e.g. https://qsykyiqplslvmxdfudxq.supabase.co/functions/v1
  return `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
}

export function appBaseUrl(): string {
  // The web app origin used for the consent screen.
  return Deno.env.get("APP_BASE_URL") ?? "https://app.olseny.com";
}
