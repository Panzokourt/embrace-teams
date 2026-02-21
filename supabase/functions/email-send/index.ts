import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return await res.json();
}

async function getValidAccessToken(supabase: any, tokenRecord: any): Promise<string | null> {
  const expiresAt = new Date(tokenRecord.token_expires_at).getTime();
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(tokenRecord.refresh_token);
    if (!refreshed) return null;
    await supabase.from("gmail_oauth_tokens").update({ access_token: refreshed.access_token, token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() }).eq("id", tokenRecord.id);
    return refreshed.access_token;
  }
  return tokenRecord.access_token;
}

function buildRawEmail(params: {
  from: string; fromName: string; to: string[]; cc: string[]; subject: string; body: string;
  inReplyTo?: string; references?: string; attachments?: { filename: string; mimeType: string; data: string }[];
}): string {
  const boundary = `boundary_${crypto.randomUUID().replace(/-/g, '')}`;
  const hasAttachments = params.attachments && params.attachments.length > 0;

  const lines: string[] = [];
  lines.push(`From: ${params.fromName ? `"${params.fromName}" <${params.from}>` : params.from}`);
  lines.push(`To: ${params.to.join(", ")}`);
  if (params.cc.length > 0) lines.push(`Cc: ${params.cc.join(", ")}`);
  lines.push(`Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`);
  lines.push("MIME-Version: 1.0");
  if (params.inReplyTo) lines.push(`In-Reply-To: <${params.inReplyTo}>`);
  if (params.references) lines.push(`References: <${params.references}>`);

  if (hasAttachments) {
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(btoa(unescape(encodeURIComponent(params.body))));

    for (const att of params.attachments!) {
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${att.mimeType}; name="${att.filename}"`);
      lines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
      lines.push("Content-Transfer-Encoding: base64");
      lines.push("");
      lines.push(att.data);
    }
    lines.push(`--${boundary}--`);
  } else {
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(btoa(unescape(encodeURIComponent(params.body))));
  }

  const raw = lines.join("\r\n");
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const { to, cc, subject, body, reply_to_message_id, attachments } = await req.json();

    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: gmailToken, error: tokenErr } = await supabase.from("gmail_oauth_tokens").select("*").eq("user_id", userId).eq("is_active", true).single();
    if (tokenErr || !gmailToken) {
      return new Response(JSON.stringify({ error: "Gmail account not connected" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const accessToken = await getValidAccessToken(supabase, gmailToken);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Token refresh failed. Please reconnect Gmail." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let inReplyTo: string | undefined;
    let references: string | undefined;
    let threadId: string | undefined;

    if (reply_to_message_id) {
      const { data: replyMsg } = await supabase.from("email_messages").select("message_id_header, thread_id").eq("id", reply_to_message_id).single();
      if (replyMsg) {
        inReplyTo = replyMsg.message_id_header || undefined;
        references = replyMsg.message_id_header || undefined;
        threadId = replyMsg.thread_id || undefined;
      }
    }

    const toAddresses = Array.isArray(to) ? to : [to];
    const ccAddresses = cc ? (Array.isArray(cc) ? cc : [cc]) : [];

    const raw = buildRawEmail({
      from: gmailToken.email_address,
      fromName: gmailToken.display_name || "",
      to: toAddresses,
      cc: ccAddresses,
      subject,
      body,
      inReplyTo,
      references,
      attachments: attachments || undefined,
    });

    const sendBody: any = { raw };
    if (threadId) sendBody.threadId = threadId;

    const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(sendBody),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error("Gmail send error:", errText);
      return new Response(JSON.stringify({ error: `Gmail send failed: ${errText}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sentResult = await sendRes.json();

    const { data: sentMsg } = await supabase.from("email_messages").insert({
      account_id: gmailToken.id,
      user_id: userId,
      message_uid: sentResult.id,
      message_id_header: null,
      thread_id: sentResult.threadId || threadId || sentResult.id,
      subject,
      from_address: gmailToken.email_address,
      from_name: gmailToken.display_name || gmailToken.email_address,
      to_addresses: toAddresses,
      cc_addresses: ccAddresses,
      body_text: body,
      is_read: true,
      folder: "Sent",
      sent_at: new Date().toISOString(),
    }).select().single();

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully!", email: sentMsg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("email-send error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
