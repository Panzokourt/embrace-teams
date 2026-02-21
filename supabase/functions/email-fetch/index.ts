import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const { account_id, action } = await req.json();

    if (action === "test") {
      // Test connection - just verify account exists and belongs to user
      const { data: account, error: accErr } = await supabase
        .from("email_accounts")
        .select("*")
        .eq("id", account_id)
        .eq("user_id", user.id)
        .single();

      if (accErr || !account) {
        return new Response(
          JSON.stringify({ error: "Account not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Note: Direct IMAP connections are blocked on Deno Deploy (ports 993/143).
      // In production, this would connect via an external IMAP proxy/relay service.
      // For now, we validate the configuration is complete.
      const configValid =
        account.imap_host &&
        account.imap_port &&
        account.smtp_host &&
        account.smtp_port &&
        account.username &&
        account.encrypted_password;

      if (!configValid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Incomplete configuration. Please fill in all fields.",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message:
            "Configuration validated. Email sync will work when IMAP proxy is configured.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch emails
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

    // Note: Direct IMAP is not available on Deno Deploy.
    // This endpoint returns cached messages from the database.
    // In a production setup, an external worker would sync emails to the DB.
    
    const { data: messages, error: msgErr } = await supabase
      .from("email_messages")
      .select("*")
      .eq("account_id", account_id)
      .eq("user_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(100);

    if (msgErr) {
      return new Response(JSON.stringify({ error: msgErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by thread
    const threads: Record<string, any[]> = {};
    for (const msg of messages || []) {
      const tid = msg.thread_id || msg.id;
      if (!threads[tid]) threads[tid] = [];
      threads[tid].push(msg);
    }

    // Update last_sync_at
    await supabase
      .from("email_accounts")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", account_id);

    return new Response(
      JSON.stringify({ threads, messages: messages || [], count: (messages || []).length }),
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
