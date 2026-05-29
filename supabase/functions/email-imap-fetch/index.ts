import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow@1.0.164";
import { simpleParser } from "npm:mailparser@3.7.1";
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

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit) || 25, 1), 100);

    const { data: account, error: accErr } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    if (accErr || !account) return json({ error: "No active IMAP account" }, 404);

    const password = await decryptPassword(account.encrypted_password);

    const client = new ImapFlow({
      host: account.imap_host,
      port: account.imap_port,
      secure: !!account.use_tls,
      auth: { user: account.username, pass: password },
      logger: false,
    });

    let fetched = 0, inserted = 0;
    try {
      await client.connect();
      const lock = await client.getMailboxLock("INBOX");
      try {
        const status = await client.status("INBOX", { messages: true });
        const total = status.messages || 0;
        if (total === 0) {
          return json({ ok: true, fetched: 0, inserted: 0 });
        }
        const start = Math.max(1, total - limit + 1);
        const range = `${start}:${total}`;

        for await (const msg of client.fetch(range, { envelope: true, source: true, uid: true, flags: true })) {
          fetched++;
          const uid = String(msg.uid);

          // Dedup
          const { data: exists } = await supabase
            .from("email_messages")
            .select("id")
            .eq("account_id", account.id)
            .eq("message_uid", uid)
            .maybeSingle();
          if (exists?.id) continue;

          let parsed: any = {};
          try {
            parsed = await simpleParser(msg.source as Uint8Array);
          } catch (e) {
            console.warn("parse failed for uid", uid, e);
          }

          const env = msg.envelope || {};
          const fromAddr = (parsed.from?.value?.[0]?.address) || env.from?.[0]?.address || null;
          const fromName = (parsed.from?.value?.[0]?.name) || env.from?.[0]?.name || null;
          const toList = (parsed.to?.value || env.to || []).map((a: any) => ({
            address: a.address, name: a.name,
          }));
          const ccList = (parsed.cc?.value || env.cc || []).map((a: any) => ({
            address: a.address, name: a.name,
          }));

          const { error: insErr } = await supabase.from("email_messages").insert({
            account_id: account.id,
            user_id: userId,
            message_uid: uid,
            message_id_header: parsed.messageId || env.messageId || null,
            thread_id: env.inReplyTo || null,
            subject: parsed.subject || env.subject || null,
            from_address: fromAddr,
            from_name: fromName,
            to_addresses: toList,
            cc_addresses: ccList,
            body_text: parsed.text || null,
            body_html: parsed.html || null,
            is_read: !!(msg.flags && (msg.flags as any).has?.("\\Seen")),
            folder: "INBOX",
            sent_at: (parsed.date || env.date || new Date()).toString
              ? new Date(parsed.date || env.date || Date.now()).toISOString()
              : new Date().toISOString(),
          });
          if (!insErr) inserted++;
          else console.warn("insert failed:", insErr.message);
        }
      } finally {
        lock.release();
      }
      await client.logout();
    } catch (e: any) {
      try { await client.close(); } catch (_) { /* ignore */ }
      return json({ error: e?.message || String(e) }, 500);
    }

    await supabase.from("email_accounts").update({ last_sync_at: new Date().toISOString() }).eq("id", account.id);

    return json({ ok: true, fetched, inserted });
  } catch (e: any) {
    console.error("email-imap-fetch error:", e);
    return json({ error: e?.message || "Unknown error" }, 500);
  }
});
