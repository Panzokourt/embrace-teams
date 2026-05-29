import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";
import { decryptPassword } from "../_shared/email-crypto.ts";

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

function normalize(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return String(v).split(",").map((s) => s.trim()).filter(Boolean);
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
    const { to, cc, bcc, subject, html, text, reply_to } = body ?? {};
    const toList = normalize(to);
    if (toList.length === 0) return json({ error: "to required" }, 400);
    if (!subject) return json({ error: "subject required" }, 400);
    if (!html && !text) return json({ error: "html or text required" }, 400);

    const { data: account, error: accErr } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    if (accErr || !account) return json({ error: "No active IMAP account" }, 404);

    const password = await decryptPassword(account.encrypted_password);

    const transporter = nodemailer.createTransport({
      host: account.smtp_host,
      port: account.smtp_port,
      secure: account.smtp_port === 465,
      requireTLS: !!account.use_tls && account.smtp_port !== 465,
      auth: { user: account.username, pass: password },
    });

    const fromHeader = account.display_name
      ? `"${account.display_name}" <${account.email_address}>`
      : account.email_address;

    const info = await transporter.sendMail({
      from: fromHeader,
      to: toList.join(", "),
      cc: normalize(cc).join(", ") || undefined,
      bcc: normalize(bcc).join(", ") || undefined,
      replyTo: reply_to || undefined,
      subject,
      html: html || undefined,
      text: text || undefined,
    });

    return json({ ok: true, message_id: info.messageId, accepted: info.accepted, rejected: info.rejected });
  } catch (e: any) {
    console.error("email-imap-send error:", e);
    return json({ error: e?.message || "Unknown error" }, 500);
  }
});
