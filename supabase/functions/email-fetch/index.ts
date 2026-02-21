import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Minimal IMAP client using Deno.connectTls ───

class SimpleIMAP {
  private conn!: Deno.TlsConn;
  private reader!: ReadableStreamDefaultReader<Uint8Array>;
  private buffer = "";
  private tag = 0;
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();

  async connect(host: string, port: number) {
    this.conn = await Deno.connectTls({ hostname: host, port });
    this.reader = this.conn.readable.getReader();
    // Read greeting
    await this.readUntilTag("*");
  }

  private nextTag(): string {
    this.tag++;
    return `A${this.tag}`;
  }

  private async readMore(): Promise<string> {
    const { value, done } = await this.reader.read();
    if (done) throw new Error("Connection closed");
    return this.decoder.decode(value);
  }

  private async readUntilTag(tag: string): Promise<string> {
    let result = this.buffer;
    const endPattern = `${tag} `;

    while (true) {
      const lines = result.split("\r\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith(endPattern) || lines[i].startsWith("* OK") && tag === "*") {
          // Found the tagged response
          this.buffer = lines.slice(i + 1).join("\r\n");
          return lines.slice(0, i + 1).join("\r\n");
        }
      }
      result += await this.readMore();
    }
  }

  private async command(cmd: string): Promise<string> {
    const tag = this.nextTag();
    const fullCmd = `${tag} ${cmd}\r\n`;
    const writer = this.conn.writable.getWriter();
    await writer.write(this.encoder.encode(fullCmd));
    writer.releaseLock();

    // Read until we get the tagged response
    let result = this.buffer;
    while (true) {
      const lines = result.split("\r\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith(`${tag} `)) {
          this.buffer = lines.slice(i + 1).join("\r\n");
          const response = lines.slice(0, i + 1).join("\r\n");
          if (lines[i].includes("NO") || lines[i].includes("BAD")) {
            throw new Error(`IMAP error: ${lines[i]}`);
          }
          return response;
        }
      }
      result += await this.readMore();
    }
  }

  async login(username: string, password: string) {
    await this.command(`LOGIN "${username}" "${password}"`);
  }

  async selectInbox(): Promise<number> {
    const res = await this.command("SELECT INBOX");
    const match = res.match(/\* (\d+) EXISTS/);
    return match ? parseInt(match[1]) : 0;
  }

  async fetchMessages(startSeq: number, endSeq: number): Promise<string> {
    if (startSeq > endSeq) return "";
    const res = await this.command(
      `FETCH ${startSeq}:${endSeq} (UID FLAGS BODY[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID IN-REPLY-TO REFERENCES)] BODY[TEXT])`
    );
    return res;
  }

  async logout() {
    try {
      const tag = this.nextTag();
      const writer = this.conn.writable.getWriter();
      await writer.write(this.encoder.encode(`${tag} LOGOUT\r\n`));
      writer.releaseLock();
    } catch {
      // ignore
    }
    try {
      this.conn.close();
    } catch {
      // ignore
    }
  }
}

// ─── Parse IMAP FETCH response into messages ───

interface ParsedEmail {
  uid: string;
  from_address: string;
  from_name: string;
  to_addresses: string[];
  cc_addresses: string[];
  subject: string;
  date: string;
  message_id: string;
  in_reply_to: string;
  references: string;
  body_text: string;
  is_read: boolean;
}

function parseHeader(headerBlock: string, field: string): string {
  const regex = new RegExp(`^${field}:\\s*(.+?)(?=\\r?\\n[A-Za-z-]+:|$)`, "ims");
  const match = headerBlock.match(regex);
  return match ? match[1].replace(/\r?\n\s+/g, " ").trim() : "";
}

function parseFromField(from: string): { name: string; address: string } {
  const match = from.match(/^"?([^"<]*)"?\s*<?([^>]+)>?$/);
  if (match) {
    return { name: match[1].trim(), address: match[2].trim() };
  }
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
  const markers = [
    /^--\s*$/m,
    /^Sent from my /m,
    /^Get Outlook for /m,
    /^_{3,}/m,
    /^-{3,}/m,
    /^Στάλθηκε από /m,
    /^Αποστολή από /m,
  ];
  let cleanText = text;
  for (const marker of markers) {
    const match = cleanText.match(marker);
    if (match && match.index !== undefined) {
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

function parseFetchResponse(raw: string): ParsedEmail[] {
  const messages: ParsedEmail[] = [];

  // Split by FETCH boundaries
  const fetchBlocks = raw.split(/\* \d+ FETCH/);

  for (const block of fetchBlocks) {
    if (!block.trim()) continue;

    // Extract UID
    const uidMatch = block.match(/UID (\d+)/);
    const uid = uidMatch ? uidMatch[1] : "";

    // Extract flags
    const flagsMatch = block.match(/FLAGS \(([^)]*)\)/);
    const flags = flagsMatch ? flagsMatch[1] : "";
    const isRead = flags.includes("\\Seen");

    // Extract header block - between first { and the next {
    const headerMatch = block.match(/BODY\[HEADER\.FIELDS[^\]]*\]\s*\{(\d+)\}\r?\n([\s\S]*?)(?=BODY\[TEXT\]|\)$)/i);
    const headerBlock = headerMatch ? headerMatch[2] : "";

    // Extract body text
    const bodyMatch = block.match(/BODY\[TEXT\]\s*\{(\d+)\}\r?\n([\s\S]*?)(?=\)\r?\n|$)/i);
    let bodyText = bodyMatch ? bodyMatch[2] : "";

    // Clean body
    bodyText = stripSignature(stripQuotedText(bodyText));

    const from = parseHeader(headerBlock, "From");
    const { name, address } = parseFromField(from);

    const email: ParsedEmail = {
      uid,
      from_name: name,
      from_address: address,
      to_addresses: parseAddressList(parseHeader(headerBlock, "To")),
      cc_addresses: parseAddressList(parseHeader(headerBlock, "Cc")),
      subject: parseHeader(headerBlock, "Subject"),
      date: parseHeader(headerBlock, "Date"),
      message_id: parseHeader(headerBlock, "Message-ID").replace(/[<>]/g, ""),
      in_reply_to: parseHeader(headerBlock, "In-Reply-To").replace(/[<>]/g, ""),
      references: parseHeader(headerBlock, "References"),
      body_text: bodyText.trim(),
      is_read: isRead,
    };

    if (email.uid || email.subject || email.from_address) {
      messages.push(email);
    }
  }

  return messages;
}

function computeThreadId(email: ParsedEmail): string {
  if (email.in_reply_to) return email.in_reply_to;
  if (email.references) {
    const refs = email.references.split(/\s+/).filter(Boolean);
    if (refs.length > 0) return refs[0].replace(/[<>]/g, "");
  }
  return email.message_id || crypto.randomUUID();
}

// ─── Main handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { account_id, action } = await req.json();

    // Fetch account
    const { data: account, error: accErr } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("id", account_id)
      .eq("user_id", user.id)
      .single();

    if (accErr || !account) {
      return new Response(JSON.stringify({ error: "Account not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const configValid = account.imap_host && account.imap_port && account.username && account.encrypted_password;
    if (!configValid) {
      return new Response(
        JSON.stringify({ success: false, error: "Incomplete configuration." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Test action ───
    if (action === "test") {
      try {
        const imap = new SimpleIMAP();
        await imap.connect(account.imap_host, account.imap_port);
        await imap.login(account.username, account.encrypted_password);
        const count = await imap.selectInbox();
        await imap.logout();
        return new Response(
          JSON.stringify({ success: true, message: `Σύνδεση επιτυχής! ${count} emails στα εισερχόμενα.` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: `Αποτυχία σύνδεσης: ${String(err)}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ─── Fetch/sync emails ───
    try {
      const imap = new SimpleIMAP();
      await imap.connect(account.imap_host, account.imap_port);
      await imap.login(account.username, account.encrypted_password);
      const totalMessages = await imap.selectInbox();

      if (totalMessages === 0) {
        await imap.logout();
        await supabase
          .from("email_accounts")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", account_id);

        return new Response(
          JSON.stringify({ success: true, count: 0, message: "No emails found." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch last 50 messages
      const startSeq = Math.max(1, totalMessages - 49);
      const rawFetch = await imap.fetchMessages(startSeq, totalMessages);
      await imap.logout();

      const parsedEmails = parseFetchResponse(rawFetch);

      // Upsert into email_messages
      const toInsert = parsedEmails.map((email) => ({
        account_id: account_id,
        user_id: user.id,
        message_uid: email.uid,
        message_id_header: email.message_id || null,
        thread_id: computeThreadId(email),
        subject: email.subject || null,
        from_address: email.from_address || null,
        from_name: email.from_name || null,
        to_addresses: email.to_addresses,
        cc_addresses: email.cc_addresses,
        body_text: email.body_text || null,
        body_html: null,
        is_read: email.is_read,
        is_starred: false,
        folder: "INBOX",
        sent_at: email.date ? new Date(email.date).toISOString() : null,
      }));

      if (toInsert.length > 0) {
        // Delete existing messages for this account to avoid duplicates, then insert fresh
        await supabase
          .from("email_messages")
          .delete()
          .eq("account_id", account_id)
          .eq("user_id", user.id);

        // Insert in batches of 50
        for (let i = 0; i < toInsert.length; i += 50) {
          const batch = toInsert.slice(i, i + 50);
          const { error: insertErr } = await supabase
            .from("email_messages")
            .insert(batch);
          if (insertErr) {
            console.error("Insert error:", insertErr);
          }
        }
      }

      // Update last_sync_at
      await supabase
        .from("email_accounts")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", account_id);

      return new Response(
        JSON.stringify({ success: true, count: toInsert.length, message: `Synced ${toInsert.length} emails.` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("IMAP fetch error:", err);
      return new Response(
        JSON.stringify({ success: false, error: `IMAP error: ${String(err)}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
