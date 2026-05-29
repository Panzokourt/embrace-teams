import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptPassword } from "../_shared/email-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: authErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const {
      email_address, display_name,
      imap_host, imap_port, smtp_host, smtp_port,
      username, password, use_tls = true,
    } = body ?? {};

    if (!email_address || !imap_host || !smtp_host || !username || !password) {
      return json({ error: "Missing required fields" }, 400);
    }

    // Get user's company_id
    const { data: roleRow, error: roleErr } = await supabase
      .from("user_company_roles")
      .select("company_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (roleErr || !roleRow?.company_id) {
      return json({ error: "No active company for user" }, 400);
    }

    const encrypted = await encryptPassword(password);

    // Upsert (one account per user — replace existing IMAP/SMTP record)
    const { data: existing } = await supabase
      .from("email_accounts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const payload = {
      user_id: userId,
      company_id: roleRow.company_id,
      email_address,
      display_name: display_name || null,
      imap_host,
      imap_port: Number(imap_port) || 993,
      smtp_host,
      smtp_port: Number(smtp_port) || 587,
      username,
      encrypted_password: encrypted,
      use_tls: !!use_tls,
      is_active: true,
    };

    const { data, error } = existing?.id
      ? await supabase.from("email_accounts").update(payload).eq("id", existing.id).select().single()
      : await supabase.from("email_accounts").insert(payload).select().single();

    if (error) return json({ error: error.message }, 400);
    return json({ ok: true, account: { id: data.id, email_address: data.email_address } });
  } catch (e: any) {
    console.error("email-imap-save error:", e);
    return json({ error: e?.message || "Unknown error" }, 500);
  }
});
