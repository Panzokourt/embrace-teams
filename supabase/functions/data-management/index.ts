import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORY_TABLES: Record<string, string[]> = {
  projects: [
    "time_entries", "comments", "file_attachments", "file_folders",
    "deliverables", "tasks", "project_user_access", "project_team_access",
    "user_access_assignments", "projects",
  ],
  clients: ["contacts", "contact_tags", "client_user_access", "clients"],
  proposals: ["proposal_items", "proposals", "contracts", "invoices", "expenses"],
  media: ["media_plan_item_snapshots", "media_plan_items", "media_plans"],
  communication: [
    "chat_message_reactions", "chat_message_tags", "chat_message_attachments",
    "chat_messages", "chat_channel_members", "chat_channels",
    "secretary_messages", "secretary_conversations",
  ],
  hr: ["hr_documents", "leave_requests", "leave_balances"],
  brain: ["brain_deep_dives", "brain_insights"],
  logs: ["notifications", "activity_log"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { action, categories, company_id } = await req.json();

    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin/owner
    const { data: roleData } = await supabaseAdmin
      .from("user_company_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("company_id", company_id)
      .in("role", ["owner", "admin", "super_admin"])
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden - admin required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: counts
    if (action === "counts") {
      const counts: Record<string, number> = {};
      for (const [cat, tables] of Object.entries(CATEGORY_TABLES)) {
        let total = 0;
        // Count from the main table (last one in each category)
        const mainTable = tables[tables.length - 1];
        try {
          const { count } = await supabaseAdmin
            .from(mainTable)
            .select("*", { count: "exact", head: true })
            .eq("company_id", company_id);
          total = count || 0;
        } catch {
          // Table might not have company_id directly
          total = 0;
        }
        counts[cat] = total;
      }
      return new Response(JSON.stringify({ counts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: delete
    if (action === "delete") {
      if (!categories || !Array.isArray(categories) || categories.length === 0) {
        return new Response(JSON.stringify({ error: "categories array required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: Record<string, number> = {};

      for (const cat of categories) {
        const tables = CATEGORY_TABLES[cat];
        if (!tables) continue;

        let deleted = 0;
        for (const table of tables) {
          try {
            // Some tables have company_id directly, others need joins
            // We'll try direct company_id first
            const { count } = await supabaseAdmin
              .from(table)
              .delete({ count: "exact" })
              .eq("company_id", company_id);
            deleted += count || 0;
          } catch {
            // If table doesn't have company_id, skip (child records cascade)
          }
        }
        results[cat] = deleted;
      }

      // Audit log
      await supabaseAdmin.from("activity_log").insert({
        user_id: userId,
        company_id,
        entity_type: "data_management",
        entity_id: company_id,
        action: "bulk_delete",
        details: { categories, results },
      });

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
