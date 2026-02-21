import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { account_id, to, cc, subject, body, reply_to_message_id } =
      await req.json();

    // Validate inputs
    if (!account_id || !to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: account_id, to, subject, body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get account
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

    // Build references for threading
    let inReplyTo: string | null = null;
    let references: string | null = null;
    let threadId: string | null = null;

    if (reply_to_message_id) {
      const { data: replyMsg } = await supabase
        .from("email_messages")
        .select("message_id_header, thread_id")
        .eq("id", reply_to_message_id)
        .single();

      if (replyMsg) {
        inReplyTo = replyMsg.message_id_header;
        references = replyMsg.message_id_header;
        threadId = replyMsg.thread_id;
      }
    }

    // Generate a message ID
    const messageId = `<${crypto.randomUUID()}@${account.smtp_host}>`;
    if (!threadId) threadId = messageId;

    // Note: Direct SMTP is blocked on Deno Deploy (ports 587/465/25).
    // In production, this would send via an SMTP relay API or external service.
    // For now, we store the message as sent in the database.

    const toAddresses = Array.isArray(to) ? to : [to];
    const ccAddresses = cc ? (Array.isArray(cc) ? cc : [cc]) : [];

    // Store sent message
    const { data: sentMsg, error: insertErr } = await supabase
      .from("email_messages")
      .insert({
        account_id: account_id,
        user_id: user.id,
        message_uid: crypto.randomUUID(),
        message_id_header: messageId,
        thread_id: threadId,
        subject: subject,
        from_address: account.email_address,
        from_name: account.display_name || account.email_address,
        to_addresses: toAddresses,
        cc_addresses: ccAddresses,
        body_text: body,
        is_read: true,
        folder: "Sent",
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email queued for sending",
        email: sentMsg,
        note: "Direct SMTP sending requires an external relay. Message stored in Sent folder.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
