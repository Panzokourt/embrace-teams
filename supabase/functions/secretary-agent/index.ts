import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Tool definitions ──────────────────────────────────────────────
const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task in a project",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "The project ID" },
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Priority level" },
          due_date: { type: "string", description: "Due date in YYYY-MM-DD format" },
          assigned_to: { type: "string", description: "User ID to assign to" },
          deliverable_id: { type: "string", description: "Optional deliverable ID" },
        },
        required: ["project_id", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update an existing task",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "The task ID to update" },
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["todo", "in_progress", "review", "done", "cancelled"] },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          due_date: { type: "string" },
          assigned_to: { type: "string" },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_tasks",
      description: "List the current user's tasks with optional filters",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status" },
          project_id: { type: "string", description: "Filter by project" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_team_tasks",
      description: "List tasks for the user's team (manager/admin only)",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string" },
          project_id: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_brief",
      description: "Create a brief of any type",
      parameters: {
        type: "object",
        properties: {
          brief_type: { type: "string", description: "Type of brief (e.g. creative, media, strategy)" },
          title: { type: "string", description: "Brief title" },
          data: { type: "object", description: "Brief data as JSON" },
          project_id: { type: "string" },
          client_id: { type: "string" },
        },
        required: ["brief_type", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_briefs",
      description: "List existing briefs with optional type filter",
      parameters: {
        type: "object",
        properties: {
          brief_type: { type: "string", description: "Filter by brief type" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_client",
      description: "Create a new client",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Client name" },
          contact_email: { type: "string" },
          contact_phone: { type: "string" },
          address: { type: "string" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_clients",
      description: "List clients with optional search",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Search query for client name" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_projects",
      description: "List projects with optional status filter",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by project status" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_folder",
      description: "Create a folder in the file system",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Folder name" },
          parent_folder_id: { type: "string", description: "Parent folder ID (optional)" },
          project_id: { type: "string", description: "Associated project ID (optional)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_leave",
      description: "Submit a leave request",
      parameters: {
        type: "object",
        properties: {
          leave_type_id: { type: "string", description: "Leave type ID" },
          start_date: { type: "string", description: "Start date YYYY-MM-DD" },
          end_date: { type: "string", description: "End date YYYY-MM-DD" },
          reason: { type: "string", description: "Reason for leave" },
        },
        required: ["leave_type_id", "start_date", "end_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_leave_balance",
      description: "Get the user's leave balance for the current year",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_project_summary",
      description: "Get a summary of a project including tasks, budget, progress",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "The project ID" },
        },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_files",
      description: "Search for files by name",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          project_id: { type: "string", description: "Optional project filter" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_deliverable",
      description: "Create a new deliverable in a project",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          budget: { type: "number" },
          due_date: { type: "string" },
        },
        required: ["project_id", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_team_members",
      description: "List team members / company employees",
      parameters: {
        type: "object",
        properties: {
          department: { type: "string", description: "Filter by department name" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_expense",
      description: "Record an expense",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
          amount: { type: "number" },
          description: { type: "string" },
          category: { type: "string" },
        },
        required: ["amount", "description"],
      },
    },
  },
];

// ── Tool execution ────────────────────────────────────────────────
async function executeTool(
  supabase: any,
  userId: string,
  companyId: string,
  toolName: string,
  args: any
): Promise<any> {
  try {
    switch (toolName) {
      case "create_task": {
        const { data, error } = await supabase.from("tasks").insert({
          project_id: args.project_id,
          title: args.title,
          description: args.description || null,
          priority: args.priority || "medium",
          due_date: args.due_date || null,
          assigned_to: args.assigned_to || null,
          deliverable_id: args.deliverable_id || null,
          status: "todo",
          company_id: companyId,
        }).select("id, title, status, priority, due_date").single();
        if (error) throw error;
        return { success: true, task: data };
      }

      case "update_task": {
        const updates: any = {};
        if (args.title) updates.title = args.title;
        if (args.description) updates.description = args.description;
        if (args.status) updates.status = args.status;
        if (args.priority) updates.priority = args.priority;
        if (args.due_date) updates.due_date = args.due_date;
        if (args.assigned_to) updates.assigned_to = args.assigned_to;
        const { data, error } = await supabase
          .from("tasks")
          .update(updates)
          .eq("id", args.task_id)
          .select("id, title, status, priority")
          .single();
        if (error) throw error;
        return { success: true, task: data };
      }

      case "list_my_tasks": {
        let q = supabase
          .from("tasks")
          .select("id, title, status, priority, due_date, project_id, projects(name)")
          .eq("assigned_to", userId)
          .order("created_at", { ascending: false })
          .limit(30);
        if (args.status) q = q.eq("status", args.status);
        if (args.project_id) q = q.eq("project_id", args.project_id);
        const { data, error } = await q;
        if (error) throw error;
        return { tasks: data, count: data.length };
      }

      case "list_team_tasks": {
        let q = supabase
          .from("tasks")
          .select("id, title, status, priority, due_date, assigned_to, profiles!tasks_assigned_to_fkey(full_name), projects(name)")
          .order("created_at", { ascending: false })
          .limit(50);
        if (args.status) q = q.eq("status", args.status);
        if (args.project_id) q = q.eq("project_id", args.project_id);
        const { data, error } = await q;
        if (error) throw error;
        return { tasks: data, count: data.length };
      }

      case "create_brief": {
        const { data, error } = await supabase.from("briefs").insert({
          brief_type: args.brief_type,
          title: args.title,
          data: args.data || {},
          project_id: args.project_id || null,
          client_id: args.client_id || null,
          created_by: userId,
          company_id: companyId,
        }).select("id, title, brief_type").single();
        if (error) throw error;
        return { success: true, brief: data };
      }

      case "list_briefs": {
        let q = supabase
          .from("briefs")
          .select("id, title, brief_type, status, created_at")
          .order("created_at", { ascending: false })
          .limit(20);
        if (args.brief_type) q = q.eq("brief_type", args.brief_type);
        const { data, error } = await q;
        if (error) throw error;
        return { briefs: data, count: data.length };
      }

      case "create_client": {
        const { data, error } = await supabase.from("clients").insert({
          name: args.name,
          contact_email: args.contact_email || null,
          contact_phone: args.contact_phone || null,
          address: args.address || null,
          company_id: companyId,
        }).select("id, name").single();
        if (error) throw error;
        return { success: true, client: data };
      }

      case "list_clients": {
        let q = supabase
          .from("clients")
          .select("id, name, contact_email, contact_phone")
          .order("name")
          .limit(30);
        if (args.search) q = q.ilike("name", `%${args.search}%`);
        const { data, error } = await q;
        if (error) throw error;
        return { clients: data, count: data.length };
      }

      case "list_projects": {
        let q = supabase
          .from("projects")
          .select("id, name, status, client_id, clients(name)")
          .order("created_at", { ascending: false })
          .limit(30);
        if (args.status) q = q.eq("status", args.status);
        const { data, error } = await q;
        if (error) throw error;
        return { projects: data, count: data.length };
      }

      case "create_folder": {
        const { data, error } = await supabase.from("file_folders").insert({
          name: args.name,
          parent_folder_id: args.parent_folder_id || null,
          project_id: args.project_id || null,
          created_by: userId,
        }).select("id, name").single();
        if (error) throw error;
        return { success: true, folder: data };
      }

      case "request_leave": {
        const start = new Date(args.start_date);
        const end = new Date(args.end_date);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const days_count = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const { data, error } = await supabase.from("leave_requests").insert({
          leave_type_id: args.leave_type_id,
          start_date: args.start_date,
          end_date: args.end_date,
          reason: args.reason || null,
          days_count,
          user_id: userId,
          company_id: companyId,
          status: "pending",
        }).select("id, start_date, end_date, days_count, status").single();
        if (error) throw error;
        return { success: true, leave_request: data };
      }

      case "list_leave_balance": {
        const year = new Date().getFullYear();
        const { data, error } = await supabase
          .from("leave_balances")
          .select("*, leave_types(name, code)")
          .eq("user_id", userId)
          .eq("year", year);
        if (error) throw error;
        return { balances: data };
      }

      case "get_project_summary": {
        const [projRes, tasksRes, delRes] = await Promise.all([
          supabase.from("projects").select("id, name, status, budget, client_id, clients(name)").eq("id", args.project_id).single(),
          supabase.from("tasks").select("id, status").eq("project_id", args.project_id),
          supabase.from("deliverables").select("id, name, completed, budget").eq("project_id", args.project_id),
        ]);
        if (projRes.error) throw projRes.error;
        const tasks = tasksRes.data || [];
        const totalTasks = tasks.length;
        const doneTasks = tasks.filter((t: any) => t.status === "done").length;
        return {
          project: projRes.data,
          tasks: { total: totalTasks, done: doneTasks, progress: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0 },
          deliverables: delRes.data || [],
        };
      }

      case "search_files": {
        let q = supabase
          .from("file_attachments")
          .select("id, file_name, project_id, created_at")
          .ilike("file_name", `%${args.query}%`)
          .order("created_at", { ascending: false })
          .limit(20);
        if (args.project_id) q = q.eq("project_id", args.project_id);
        const { data, error } = await q;
        if (error) throw error;
        return { files: data, count: data.length };
      }

      case "create_deliverable": {
        const { data, error } = await supabase.from("deliverables").insert({
          project_id: args.project_id,
          name: args.name,
          description: args.description || null,
          budget: args.budget || null,
          due_date: args.due_date || null,
        }).select("id, name").single();
        if (error) throw error;
        return { success: true, deliverable: data };
      }

      case "list_team_members": {
        let q = supabase
          .from("profiles")
          .select("id, full_name, email, job_title, department, department_id, departments(name)")
          .eq("status", "active")
          .order("full_name")
          .limit(50);
        if (args.department) {
          q = q.ilike("department", `%${args.department}%`);
        }
        const { data, error } = await q;
        if (error) throw error;
        return { members: data, count: data.length };
      }

      case "create_expense": {
        const { data, error } = await supabase.from("expenses").insert({
          project_id: args.project_id || null,
          amount: args.amount,
          description: args.description,
          category: args.category || null,
          expense_date: new Date().toISOString().split("T")[0],
          expense_type: "operational",
        }).select("id, amount, description").single();
        if (error) throw error;
        return { success: true, expense: data };
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    console.error(`Tool ${toolName} error:`, err);
    return { error: err.message || "Tool execution failed" };
  }
}

// ── Main handler ──────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { messages } = await req.json();

    // Fetch user context in parallel
    const [profileRes, companyRoleRes, projectsRes, tasksRes, clientsRes, leaveTypesRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, job_title, department").eq("id", userId).single(),
      supabase.from("user_company_roles").select("company_id, role, access_scope").eq("user_id", userId).limit(1).single(),
      supabase.from("projects").select("id, name, status").order("created_at", { ascending: false }).limit(30),
      supabase.from("tasks").select("id, title, status, priority, project_id").eq("assigned_to", userId).neq("status", "done").order("created_at", { ascending: false }).limit(30),
      supabase.from("clients").select("id, name").order("name").limit(30),
      supabase.from("leave_types").select("id, name, code").limit(20),
    ]);

    const profile = profileRes.data;
    const companyRole = companyRoleRes.data;
    const companyId = companyRole?.company_id || "";

    // Build context string
    const contextParts = [
      `Χρήστης: ${profile?.full_name || "Unknown"} (${profile?.email})`,
      `Θέση: ${profile?.job_title || "N/A"}`,
      `Ρόλος: ${companyRole?.role || "member"}`,
      `\nΕνεργά Projects (${(projectsRes.data || []).length}):`,
      ...(projectsRes.data || []).map((p: any) => `- ${p.name} (id: ${p.id}, status: ${p.status})`),
      `\nΤα tasks μου (${(tasksRes.data || []).length}):`,
      ...(tasksRes.data || []).map((t: any) => `- ${t.title} [${t.status}/${t.priority}] (id: ${t.id})`),
      `\nΠελάτες (${(clientsRes.data || []).length}):`,
      ...(clientsRes.data || []).map((c: any) => `- ${c.name} (id: ${c.id})`),
      `\nΤύποι αδειών:`,
      ...(leaveTypesRes.data || []).map((lt: any) => `- ${lt.name} (id: ${lt.id}, code: ${lt.code})`),
    ];

    const systemPrompt = `Είσαι ο Secretary, ο AI βοηθός μιας εταιρείας επικοινωνίας/marketing.
Μπορείς να εκτελείς ενέργειες στο σύστημα χρησιμοποιώντας τα tools σου.

Κανόνες:
- Αν λείπουν απαραίτητες παράμετροι, ρώτα τον χρήστη πριν εκτελέσεις
- Χρησιμοποίησε markdown στις απαντήσεις σου
- Μιλάς πάντα ελληνικά εκτός αν σε ρωτήσουν σε άλλη γλώσσα
- Αν δεν μπορείς να κάνεις κάτι, εξήγησε γιατί
- Αν η ενέργεια αποτύχει (π.χ. λόγω δικαιωμάτων), ενημέρωσε τον χρήστη
- Όταν δημιουργείς κάτι, επιβεβαίωσε τι δημιούργησες με λεπτομέρειες
- Να είσαι φιλικός, αποτελεσματικός και συνοπτικός

Context δεδομένων χρήστη:
${contextParts.join("\n")}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Tool calling loop (max 5 iterations)
    let conversationMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    for (let i = 0; i < 5; i++) {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: conversationMessages,
          tools: toolDefinitions,
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Πολλά αιτήματα. Δοκίμασε ξανά σε λίγο." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Απαιτείται ανανέωση credits." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errText = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, errText);
        throw new Error("AI gateway error");
      }

      const result = await aiResponse.json();
      const choice = result.choices?.[0];

      if (!choice) throw new Error("No response from AI");

      // If no tool calls, return the text response
      if (!choice.message?.tool_calls || choice.message.tool_calls.length === 0) {
        return new Response(
          JSON.stringify({ reply: choice.message?.content || "" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Execute tool calls
      conversationMessages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const fnName = toolCall.function.name;
        let fnArgs: any = {};
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || "{}");
        } catch {}

        console.log(`Executing tool: ${fnName}`, fnArgs);
        const toolResult = await executeTool(supabase, userId, companyId, fnName, fnArgs);

        conversationMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    // If we exhausted iterations
    return new Response(
      JSON.stringify({ reply: "Η επεξεργασία ολοκληρώθηκε. Μπορώ να βοηθήσω σε κάτι άλλο;" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("secretary-agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
