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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create anon client to verify the user
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is platform admin using service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await adminClient.rpc("is_platform_admin", {
      _user_id: user.id,
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Not a platform admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);

    if (req.method === "GET") {
      const type = url.searchParams.get("type");

      if (type === "users") {
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("id, email, full_name, avatar_url, status, created_at")
          .order("created_at", { ascending: false })
          .limit(500);

        // Get company roles for all users
        const { data: roles } = await adminClient
          .from("user_company_roles")
          .select("user_id, company_id, role, status, companies(name)")
          .limit(2000);

        return new Response(JSON.stringify({ profiles, roles }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (type === "companies") {
        const { data: companies } = await adminClient
          .from("companies")
          .select("id, name, domain, logo_url, created_at")
          .order("created_at", { ascending: false })
          .limit(500);

        const { data: memberCounts } = await adminClient
          .from("user_company_roles")
          .select("company_id")
          .limit(5000);

        // Count members per company
        const counts: Record<string, number> = {};
        (memberCounts || []).forEach((r: any) => {
          counts[r.company_id] = (counts[r.company_id] || 0) + 1;
        });

        return new Response(
          JSON.stringify({
            companies: (companies || []).map((c: any) => ({
              ...c,
              member_count: counts[c.id] || 0,
            })),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (type === "stats") {
        const { count: totalUsers } = await adminClient
          .from("profiles")
          .select("*", { count: "exact", head: true });

        const { count: totalCompanies } = await adminClient
          .from("companies")
          .select("*", { count: "exact", head: true });

        const thirtyDaysAgo = new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString();
        const { count: recentSignups } = await adminClient
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", thirtyDaysAgo);

        const { count: activeUsers } = await adminClient
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");

        return new Response(
          JSON.stringify({
            totalUsers: totalUsers || 0,
            totalCompanies: totalCompanies || 0,
            recentSignups: recentSignups || 0,
            activeUsers: activeUsers || 0,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: "Invalid type parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { action, userId } = body;

      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "suspend") {
        await adminClient
          .from("profiles")
          .update({ status: "suspended" })
          .eq("id", userId);
        await adminClient
          .from("user_company_roles")
          .update({ status: "suspended" })
          .eq("user_id", userId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "activate") {
        await adminClient
          .from("profiles")
          .update({ status: "active" })
          .eq("id", userId);
        await adminClient
          .from("user_company_roles")
          .update({ status: "active" })
          .eq("user_id", userId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
