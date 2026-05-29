import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow@1.0.164";
import nodemailer from "npm:nodemailer@6.9.16";

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

    const body = await req.json();
    const {
      imap_host, imap_port, smtp_host, smtp_port,
      username, password, use_tls = true,
    } = body ?? {};

    if (!imap_host || !smtp_host || !username || !password) {
      return json({ ok: false, error: "Missing required fields" }, 400);
    }

    const result: { ok: boolean; imap: boolean; smtp: boolean; error?: string } = {
      ok: false, imap: false, smtp: false,
    };

    // Test IMAP
    const client = new ImapFlow({
      host: imap_host,
      port: Number(imap_port) || 993,
      secure: !!use_tls,
      auth: { user: username, pass: password },
      logger: false,
    });
    try {
      await client.connect();
      result.imap = true;
      await client.logout();
    } catch (e: any) {
      result.error = `IMAP: ${e?.message || String(e)}`;
      try { await client.close(); } catch (_) { /* ignore */ }
      return json(result, 200);
    }

    // Test SMTP
    try {
      const transporter = nodemailer.createTransport({
        host: smtp_host,
        port: Number(smtp_port) || 587,
        secure: Number(smtp_port) === 465,
        requireTLS: !!use_tls && Number(smtp_port) !== 465,
        auth: { user: username, pass: password },
      });
      await transporter.verify();
      result.smtp = true;
    } catch (e: any) {
      result.error = `SMTP: ${e?.message || String(e)}`;
      return json(result, 200);
    }

    result.ok = result.imap && result.smtp;
    return json(result);
  } catch (e: any) {
    console.error("email-imap-test error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
