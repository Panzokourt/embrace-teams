import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Gmail API helpers ───

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    console.error("Token refresh failed:", await res.text());
    return null;
  }

  return await res.json();
}

async function getValidAccessToken(supabase: any, tokenRecord: any): Promise<string | null> {
  const expiresAt = new Date(tokenRecord.token_expires_at).getTime();
  const now = Date.now();

  // Refresh if expires within 5 minutes
  if (now > expiresAt - 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(tokenRecord.refresh_token);
    if (!refreshed) return null;

    const newExpiresAt = new Date(now + refreshed.expires_in * 1000).toISOString();
    await supabase
      .from("gmail_oauth_tokens")
      .update({ access_token: refreshed.access_token, token_expires_at: newExpiresAt })
      .eq("id", tokenRecord.id);

    return refreshed.access_token;
  }

  return tokenRecord.access_token;
}

function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return new TextDecoder().decode(
      Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
    );
  } catch {
    return "";
  }
}

function extractBody(payload: any): { text: string; html: string } {
  let text = "";
  let html = "";

  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === "text/plain") text = decoded;
    else if (payload.mimeType === "text/html") html = decoded;
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const sub = extractBody(part);
      if (sub.text) text = sub.text;
      if (sub.html) html = sub.html;
    }
  }

  return { text, html };
}

function getHeader(headers: any[], name: string): string {
  const h = headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
  return h?.value || "";
}

function parseFromField(from: string): { name: string; address: string } {
  const match = from.match(/^"?([^"<]*)"?\s*<?([^>]+)>?$/);
  if (match) return { name: match[1].trim(), address: match[2].trim() };
  return { name: "", address: from.trim() };
}

function parseAddressList(field: string): string[] {
  if (!field) return [];
  return field.split(",").map(a => {
    const match = a.match(/<([^>]+)>/);
    return match ? match[1].trim() : a.trim();
  }).filter(Boolean);
}

function stripSignature(text: string): string {
  const markers = [/^--\s*$/m, /^Sent from my /m, /^Get Outlook for /m, /^_{3,}/m, /^-{3,}/m, /^Στάλθηκε από /m, /^Αποστολή από /m];
  let cleanText = text;
  for (const marker of markers) {
    const match = cleanText.match(marker);
    if (match?.index !== undefined) {
      cleanText = cleanText.substring(0, match.index).trim();
    }
  }
  return cleanText;
}

function stripQuotedText(text: string): string {
  const lines = text.split("\n");
  const cleanLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith(">")) continue;
    if (/^On .+ wrote:$/.test(line.trim())) break;
    if (/^Στις .+ έγραψε:$/.test(line.trim())) break;
    cleanLines.push(line);
  }
  return cleanLines.join("\n").trim();
}

// ─── Main handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { action } = await req.json();

    // Get Gmail OAuth token
    const { data: gmailToken, error: tokenErr } = await supabase
      .from("gmail_oauth_tokens")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (tokenErr || !gmailToken) {
      return new Response(JSON.stringify({ error: "Gmail account not connected" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getValidAccessToken(supabase, gmailToken);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Αποτυχία ανανέωσης token. Παρακαλώ ξανασυνδέστε τον λογαριασμό Gmail." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Test action ───
    if (action === "test") {
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const profile = await res.json();
        return new Response(
          JSON.stringify({ success: true, message: `Σύνδεση επιτυχής! Email: ${profile.emailAddress}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await res.text();
      return new Response(
        JSON.stringify({ success: false, error: `Gmail API error: ${errText}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Fetch/sync emails via Gmail API ───
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&labelIds=INBOX",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!listRes.ok) {
      const errText = await listRes.text();
      console.error("Gmail list error:", errText);
      return new Response(
        JSON.stringify({ success: false, error: `Gmail API error: ${errText}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const listData = await listRes.json();
    const messageIds: string[] = (listData.messages || []).map((m: any) => m.id);

    if (messageIds.length === 0) {
      await supabase
        .from("gmail_oauth_tokens")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", gmailToken.id);

      return new Response(
        JSON.stringify({ success: true, count: 0, message: "Δεν βρέθηκαν emails." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch each message in detail (batch)
    const toInsert: any[] = [];
    const batchSize = 10;

    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      const fetches = batch.map(async (msgId) => {
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) return null;
        return await res.json();
      });

      const results = await Promise.all(fetches);

      for (const msg of results) {
        if (!msg) continue;

        const headers = msg.payload?.headers || [];
        const from = getHeader(headers, "From");
        const { name, address } = parseFromField(from);
        const { text, html } = extractBody(msg.payload);
        const cleanText = stripSignature(stripQuotedText(text));

        const isRead = !(msg.labelIds || []).includes("UNREAD");

        toInsert.push({
          account_id: gmailToken.id,
          user_id: userId,
          message_uid: msg.id,
          message_id_header: getHeader(headers, "Message-ID").replace(/[<>]/g, "") || null,
          thread_id: msg.threadId || msg.id,
          subject: getHeader(headers, "Subject") || null,
          from_address: address || null,
          from_name: name || null,
          to_addresses: parseAddressList(getHeader(headers, "To")),
          cc_addresses: parseAddressList(getHeader(headers, "Cc")),
          body_text: cleanText || null,
          body_html: html || null,
          is_read: isRead,
          is_starred: (msg.labelIds || []).includes("STARRED"),
          folder: "INBOX",
          sent_at: msg.internalDate ? new Date(parseInt(msg.internalDate)).toISOString() : null,
        });
      }
    }

    if (toInsert.length > 0) {
      // Delete existing and insert fresh
      await supabase
        .from("email_messages")
        .delete()
        .eq("account_id", gmailToken.id)
        .eq("user_id", userId);

      for (let i = 0; i < toInsert.length; i += 50) {
        const batch = toInsert.slice(i, i + 50);
        const { error: insertErr } = await supabase.from("email_messages").insert(batch);
        if (insertErr) console.error("Insert error:", insertErr);
      }
    }

    // Update last sync
    await supabase
      .from("gmail_oauth_tokens")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", gmailToken.id);

    return new Response(
      JSON.stringify({ success: true, count: toInsert.length, message: `Συγχρονίστηκαν ${toInsert.length} emails.` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("email-fetch error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
