import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(renderHtml("Σφάλμα σύνδεσης", `Google error: ${error}`, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code || !stateParam) {
      return new Response(renderHtml("Σφάλμα", "Missing code or state", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    let userId: string;
    try {
      const state = JSON.parse(atob(stateParam));
      userId = state.user_id;
    } catch {
      return new Response(renderHtml("Σφάλμα", "Invalid state", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const redirectUri = `${supabaseUrl}/functions/v1/gmail-auth-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Token exchange error:", tokenData);
      return new Response(renderHtml("Σφάλμα", `Token exchange failed: ${tokenData.error_description || tokenData.error}`, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Get user profile from Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get user's company_id
    const { data: userRole } = await supabase
      .from("user_company_roles")
      .select("company_id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (!userRole) {
      return new Response(renderHtml("Σφάλμα", "User company not found", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    // Upsert token
    const { error: upsertErr } = await supabase
      .from("gmail_oauth_tokens")
      .upsert({
        user_id: userId,
        company_id: userRole.company_id,
        email_address: profile.email,
        display_name: profile.name || profile.email,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
        is_active: true,
      }, { onConflict: "user_id" });

    if (upsertErr) {
      console.error("Upsert error:", upsertErr);
      return new Response(renderHtml("Σφάλμα", `DB error: ${upsertErr.message}`, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response(renderHtml("Επιτυχής σύνδεση!", `Ο λογαριασμός ${profile.email} συνδέθηκε. Μπορείτε να κλείσετε αυτό το παράθυρο.`, true), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("gmail-auth-callback error:", err);
    return new Response(renderHtml("Σφάλμα", String(err), false), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function renderHtml(title: string, message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
.card { background: white; border-radius: 12px; padding: 2rem; max-width: 400px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.icon { font-size: 3rem; margin-bottom: 1rem; }
h1 { font-size: 1.25rem; margin: 0 0 0.5rem; color: ${success ? '#16a34a' : '#dc2626'}; }
p { color: #666; margin: 0; }
</style></head>
<body><div class="card">
<div class="icon">${success ? '✅' : '❌'}</div>
<h1>${title}</h1>
<p>${message}</p>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'gmail-oauth-complete', success: ${success} }, '*');
    setTimeout(() => window.close(), 2000);
  }
</script>
</div></body></html>`;
}
