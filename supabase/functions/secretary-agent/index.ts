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
  {
    type: "function",
    function: {
      name: "generate_csv_report",
      description: "Generate a CSV report from data (tasks, expenses, projects, etc). Returns CSV content.",
      parameters: {
        type: "object",
        properties: {
          report_type: { type: "string", enum: ["tasks", "expenses", "projects", "team_tasks"], description: "Type of report" },
          project_id: { type: "string", description: "Optional project filter" },
          status: { type: "string", description: "Optional status filter" },
        },
        required: ["report_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_project_report",
      description: "Generate a comprehensive markdown report for a project including tasks, deliverables, budget",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "The project ID" },
        },
        required: ["project_id"],
      },
    },
  },
  // ── NEW TOOLS ──
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Create a new project",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Project name" },
          client_id: { type: "string", description: "Client ID" },
          description: { type: "string", description: "Project description" },
          budget: { type: "number", description: "Budget amount" },
          start_date: { type: "string", description: "Start date YYYY-MM-DD" },
          end_date: { type: "string", description: "End date YYYY-MM-DD" },
          status: { type: "string", enum: ["lead", "proposal", "negotiation", "tender", "active", "completed", "cancelled", "won", "lost"], description: "Project status" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project_status",
      description: "Change the status of an existing project",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "The project ID" },
          status: { type: "string", enum: ["lead", "proposal", "negotiation", "tender", "active", "completed", "cancelled", "won", "lost"], description: "New status" },
        },
        required: ["project_id", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_team_member",
      description: "Add a user to a project team",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "The project ID" },
          user_id: { type: "string", description: "The user ID to add" },
          role: { type: "string", description: "Role in the project (e.g. project_lead, member)" },
        },
        required: ["project_id", "user_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Create a calendar meeting or event",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Event title" },
          start_time: { type: "string", description: "Start datetime ISO 8601" },
          end_time: { type: "string", description: "End datetime ISO 8601" },
          event_type: { type: "string", enum: ["meeting", "deadline", "reminder", "other"], description: "Event type" },
          description: { type: "string", description: "Event description" },
          location: { type: "string", description: "Location" },
          video_link: { type: "string", description: "Video call link" },
          project_id: { type: "string", description: "Related project ID" },
          attendee_ids: { type: "array", items: { type: "string" }, description: "Array of user IDs to invite" },
        },
        required: ["title", "start_time", "end_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_time_entry",
      description: "Log a time entry for a project/task",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "The project ID" },
          task_id: { type: "string", description: "Optional task ID" },
          duration_minutes: { type: "number", description: "Duration in minutes" },
          description: { type: "string", description: "Description of work done" },
          start_time: { type: "string", description: "Start datetime ISO 8601 (defaults to now minus duration)" },
        },
        required: ["project_id", "duration_minutes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_chat_message",
      description: "Send a message to a chat channel",
      parameters: {
        type: "object",
        properties: {
          channel_id: { type: "string", description: "The chat channel ID" },
          content: { type: "string", description: "Message content" },
        },
        required: ["channel_id", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_daily_briefing",
      description: "Get a daily briefing with today's tasks, overdue tasks, calendar events, and project alerts",
      parameters: { type: "object", properties: {} },
    },
  },
  // ── BRAIN TOOLS ──
  {
    type: "function",
    function: {
      name: "run_brain_analysis",
      description: "Trigger an AI Brain analysis to generate fresh strategic insights about clients, projects, market, and team",
      parameters: {
        type: "object",
        properties: {
          focus: { type: "string", enum: ["client", "project", "market", "team"], description: "Optional focus area for the analysis" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_brain_insights",
      description: "Fetch recent Brain insights with optional filters by category, priority, or entity",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["strategic", "sales", "productivity", "market", "alert", "neuro"], description: "Filter by insight category" },
          priority: { type: "string", enum: ["high", "medium", "low"], description: "Filter by priority" },
          limit: { type: "number", description: "Max results (default 10)" },
          entity_id: { type: "string", description: "Filter insights related to a specific client/project ID" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "action_brain_insight",
      description: "Take action on a Brain insight: create a project or task from it, dismiss it, or add a note",
      parameters: {
        type: "object",
        properties: {
          insight_id: { type: "string", description: "The Brain insight ID" },
          action_type: { type: "string", enum: ["create_project", "create_task", "dismiss", "note"], description: "What action to take" },
          project_id: { type: "string", description: "Project ID (for create_task)" },
          task_title: { type: "string", description: "Task title override (for create_task)" },
          note: { type: "string", description: "Note text (for note action)" },
        },
        required: ["insight_id", "action_type"],
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

      case "generate_csv_report": {
        let rows: any[] = [];
        let headers: string[] = [];
        
        if (args.report_type === "tasks") {
          let q = supabase.from("tasks").select("title, status, priority, due_date, assigned_to, project_id, projects(name)").order("created_at", { ascending: false }).limit(200);
          if (args.project_id) q = q.eq("project_id", args.project_id);
          if (args.status) q = q.eq("status", args.status);
          const { data } = await q;
          headers = ["Τίτλος", "Status", "Priority", "Deadline", "Project"];
          rows = (data || []).map((t: any) => [t.title, t.status, t.priority, t.due_date || "", t.projects?.name || ""]);
        } else if (args.report_type === "expenses") {
          let q = supabase.from("expenses").select("description, amount, category, expense_date, project_id").order("expense_date", { ascending: false }).limit(200);
          if (args.project_id) q = q.eq("project_id", args.project_id);
          const { data } = await q;
          headers = ["Περιγραφή", "Ποσό", "Κατηγορία", "Ημερομηνία"];
          rows = (data || []).map((e: any) => [e.description, e.amount, e.category || "", e.expense_date]);
        } else if (args.report_type === "projects") {
          const { data } = await supabase.from("projects").select("name, status, budget, client_id, clients(name)").order("created_at", { ascending: false }).limit(100);
          headers = ["Όνομα", "Status", "Budget", "Πελάτης"];
          rows = (data || []).map((p: any) => [p.name, p.status, p.budget || 0, p.clients?.name || ""]);
        }
        
        const csvLines = [headers.join(","), ...rows.map((r: any) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","))];
        const csvContent = csvLines.join("\n");
        const base64 = btoa(unescape(encodeURIComponent(csvContent)));
        
        return { 
          success: true, 
          csv_base64: base64, 
          filename: `${args.report_type}_report_${new Date().toISOString().split("T")[0]}.csv`,
          row_count: rows.length 
        };
      }

      case "generate_project_report": {
        const [projRes, tasksRes, delRes, expRes] = await Promise.all([
          supabase.from("projects").select("id, name, status, budget, client_id, clients(name), created_at").eq("id", args.project_id).single(),
          supabase.from("tasks").select("id, title, status, priority, due_date, assigned_to").eq("project_id", args.project_id),
          supabase.from("deliverables").select("id, name, completed, budget, cost").eq("project_id", args.project_id),
          supabase.from("expenses").select("amount, category").eq("project_id", args.project_id),
        ]);
        if (projRes.error) throw projRes.error;
        
        const tasks = tasksRes.data || [];
        const deliverables = delRes.data || [];
        const expenses = expRes.data || [];
        const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
        const doneTasks = tasks.filter((t: any) => t.status === "done").length;
        
        return {
          success: true,
          project: projRes.data,
          summary: {
            total_tasks: tasks.length,
            done_tasks: doneTasks,
            progress: tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0,
            total_deliverables: deliverables.length,
            completed_deliverables: deliverables.filter((d: any) => d.completed).length,
            total_budget: projRes.data?.budget || 0,
            total_expenses: totalExpenses,
          },
          tasks: tasks.slice(0, 20),
          deliverables,
        };
      }

      // ── NEW TOOL EXECUTORS ──

      case "create_project": {
        const { data, error } = await supabase.from("projects").insert({
          name: args.name,
          description: args.description || null,
          client_id: args.client_id || null,
          budget: args.budget || null,
          start_date: args.start_date || null,
          end_date: args.end_date || null,
          status: args.status || "active",
          company_id: companyId,
        }).select("id, name, status, budget").single();
        if (error) throw error;
        // Also add the creator to the project team
        await supabase.from("project_user_access").insert({
          project_id: data.id,
          user_id: userId,
          role: "project_lead",
        }).select().maybeSingle();
        return { success: true, project: data };
      }

      case "update_project_status": {
        const { data, error } = await supabase
          .from("projects")
          .update({ status: args.status })
          .eq("id", args.project_id)
          .select("id, name, status")
          .single();
        if (error) throw error;
        return { success: true, project: data };
      }

      case "assign_team_member": {
        const { data, error } = await supabase.from("project_user_access").insert({
          project_id: args.project_id,
          user_id: args.user_id,
          role: args.role || "member",
        }).select("id, project_id, user_id, role").single();
        if (error) {
          if (error.code === "23505") return { success: true, message: "Ο χρήστης είναι ήδη μέλος του project" };
          throw error;
        }
        return { success: true, assignment: data };
      }

      case "create_calendar_event": {
        const { data, error } = await supabase.from("calendar_events").insert({
          title: args.title,
          start_time: args.start_time,
          end_time: args.end_time,
          event_type: args.event_type || "meeting",
          description: args.description || null,
          location: args.location || null,
          video_link: args.video_link || null,
          project_id: args.project_id || null,
          company_id: companyId,
          created_by: userId,
        }).select("id, title, start_time, end_time, event_type").single();
        if (error) throw error;
        // Add attendees if provided
        if (args.attendee_ids && args.attendee_ids.length > 0) {
          const attendeeRows = args.attendee_ids.map((uid: string) => ({
            event_id: data.id,
            user_id: uid,
            status: "pending",
          }));
          await supabase.from("calendar_event_attendees").insert(attendeeRows);
        }
        return { success: true, event: data, attendees_added: args.attendee_ids?.length || 0 };
      }

      case "log_time_entry": {
        const endTime = new Date();
        const startTime = args.start_time
          ? new Date(args.start_time)
          : new Date(endTime.getTime() - args.duration_minutes * 60000);
        
        const { data, error } = await supabase.from("time_entries").insert({
          user_id: userId,
          project_id: args.project_id,
          task_id: args.task_id || null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: args.duration_minutes,
          description: args.description || null,
          is_running: false,
        }).select("id, duration_minutes, description").single();
        if (error) throw error;
        // Update task actual_hours if task_id provided
        if (args.task_id) {
          const { data: entries } = await supabase
            .from("time_entries")
            .select("duration_minutes")
            .eq("task_id", args.task_id)
            .eq("is_running", false);
          const totalMinutes = (entries || []).reduce((s: number, e: any) => s + (e.duration_minutes || 0), 0);
          const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
          await supabase.from("tasks").update({ actual_hours: totalHours }).eq("id", args.task_id);
        }
        return { success: true, time_entry: data };
      }

      case "send_chat_message": {
        const { data, error } = await supabase.from("chat_messages").insert({
          channel_id: args.channel_id,
          user_id: userId,
          content: args.content,
          message_type: "text",
        }).select("id, content, created_at").single();
        if (error) throw error;
        // Update channel last_message_at
        await supabase.from("chat_channels").update({ last_message_at: new Date().toISOString() }).eq("id", args.channel_id);
        return { success: true, message: data };
      }

      case "get_daily_briefing": {
        const today = new Date().toISOString().split("T")[0];
        const todayStart = `${today}T00:00:00.000Z`;
        const todayEnd = `${today}T23:59:59.999Z`;

        const [myTasksRes, overdueRes, eventsRes, projectsRes, chatChannelsRes] = await Promise.all([
          // Today's tasks (due today)
          supabase.from("tasks")
            .select("id, title, status, priority, due_date, project_id, projects(name)")
            .eq("assigned_to", userId)
            .eq("due_date", today)
            .neq("status", "done")
            .neq("status", "cancelled"),
          // Overdue tasks
          supabase.from("tasks")
            .select("id, title, status, priority, due_date, project_id, projects(name)")
            .eq("assigned_to", userId)
            .lt("due_date", today)
            .neq("status", "done")
            .neq("status", "cancelled")
            .order("due_date", { ascending: true }),
          // Today's calendar events
          supabase.from("calendar_events")
            .select("id, title, start_time, end_time, event_type, location, video_link, project_id")
            .eq("company_id", companyId)
            .gte("start_time", todayStart)
            .lte("start_time", todayEnd)
            .order("start_time", { ascending: true }),
          // Projects behind schedule (active with end_date passed)
          supabase.from("projects")
            .select("id, name, status, end_date")
            .eq("company_id", companyId)
            .eq("status", "active")
            .lt("end_date", today),
          // Chat channels with recent activity
          supabase.from("chat_channels")
            .select("id, name, type")
            .eq("company_id", companyId)
            .order("last_message_at", { ascending: false })
            .limit(10),
        ]);

        // Get all open tasks count
        const { count: openTasksCount } = await supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", userId)
          .neq("status", "done")
          .neq("status", "cancelled");

        return {
          today: today,
          tasks_today: myTasksRes.data || [],
          tasks_today_count: (myTasksRes.data || []).length,
          overdue_tasks: overdueRes.data || [],
          overdue_count: (overdueRes.data || []).length,
          events_today: eventsRes.data || [],
          events_count: (eventsRes.data || []).length,
          projects_behind_schedule: projectsRes.data || [],
          projects_at_risk_count: (projectsRes.data || []).length,
          total_open_tasks: openTasksCount || 0,
          chat_channels: chatChannelsRes.data || [],
        };
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

    const { messages, current_page } = await req.json();

    // Fetch user context in parallel
    const today = new Date().toISOString().split("T")[0];
    const todayStart = `${today}T00:00:00.000Z`;
    const todayEnd = `${today}T23:59:59.999Z`;

    const [profileRes, companyRoleRes, projectsRes, tasksRes, clientsRes, leaveTypesRes, overdueRes, behindScheduleRes, todayEventsRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, job_title, department").eq("id", userId).single(),
      supabase.from("user_company_roles").select("company_id, role, access_scope").eq("user_id", userId).limit(1).single(),
      supabase.from("projects").select("id, name, status").order("created_at", { ascending: false }).limit(30),
      supabase.from("tasks").select("id, title, status, priority, project_id, due_date").eq("assigned_to", userId).neq("status", "done").order("created_at", { ascending: false }).limit(30),
      supabase.from("clients").select("id, name").order("name").limit(30),
      supabase.from("leave_types").select("id, name, code").limit(20),
      // Proactive: overdue tasks
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("assigned_to", userId).lt("due_date", today).neq("status", "done").neq("status", "cancelled"),
      // Proactive: projects behind schedule
      supabase.from("projects").select("id, name", { count: "exact" }).eq("status", "active").lt("end_date", today).limit(10),
      // Today's events count
      supabase.from("calendar_events").select("id, title, start_time", { count: "exact" }).gte("start_time", todayStart).lte("start_time", todayEnd).limit(10),
    ]);

    const profile = profileRes.data;
    const companyRole = companyRoleRes.data;
    const companyId = companyRole?.company_id || "";

    const overdueCount = overdueRes.count || 0;
    const behindScheduleCount = (behindScheduleRes.data || []).length;
    const todayEventsCount = todayEventsRes.count || 0;

    // Build context string
    const contextParts = [
      `Χρήστης: ${profile?.full_name || "Unknown"} (${profile?.email})`,
      `Θέση: ${profile?.job_title || "N/A"}`,
      `Ρόλος: ${companyRole?.role || "member"}`,
      `Σημερινή ημερομηνία: ${today}`,
      `\nΕνεργά Projects (${(projectsRes.data || []).length}):`,
      ...(projectsRes.data || []).map((p: any) => `- ${p.name} (id: ${p.id}, status: ${p.status})`),
      `\nΤα tasks μου (${(tasksRes.data || []).length}):`,
      ...(tasksRes.data || []).map((t: any) => `- ${t.title} [${t.status}/${t.priority}] (id: ${t.id}, due: ${t.due_date || "N/A"})`),
      `\nΠελάτες (${(clientsRes.data || []).length}):`,
      ...(clientsRes.data || []).map((c: any) => `- ${c.name} (id: ${c.id})`),
      `\nΤύποι αδειών:`,
      ...(leaveTypesRes.data || []).map((lt: any) => `- ${lt.name} (id: ${lt.id}, code: ${lt.code})`),
    ];

    // Build proactive alerts
    const alertParts: string[] = [];
    if (overdueCount > 0) alertParts.push(`- ⚠️ Υπάρχουν ${overdueCount} overdue tasks`);
    if (behindScheduleCount > 0) alertParts.push(`- ⚠️ ${behindScheduleCount} project(s) έχουν ξεπεράσει το deadline`);
    if (todayEventsCount > 0) alertParts.push(`- 📅 ${todayEventsCount} event(s) σήμερα`);

    // Build context awareness
    let pageContext = "";
    if (current_page) {
      pageContext = `\nΟ χρήστης βρίσκεται στη σελίδα: ${current_page}
Προσάρμοσε τις προτάσεις σου ανάλογα:
- Αν είναι σε /projects/:id → πρότεινε ενέργειες για αυτό το project (tasks, team, status update)
- Αν είναι σε /tasks → πρότεινε δημιουργία/ενημέρωση tasks
- Αν είναι σε /clients/:id → πρότεινε ενέργειες για τον πελάτη
- Αν είναι σε /calendar → πρότεινε δημιουργία events
- Αν είναι σε /timesheets → πρότεινε καταχώρηση χρόνου
- Αν είναι σε /chat → πρότεινε αποστολή μηνυμάτων
- Αν είναι σε /dashboard → προσφέρε γενική επισκόπηση`;
    }

    const systemPrompt = `Είσαι ο Secretary, ο AI βοηθός μιας εταιρείας επικοινωνίας/marketing.
Μπορείς να εκτελείς ενέργειες στο σύστημα χρησιμοποιώντας τα tools σου.

Κανόνες:
- ΠΡΙΝ εκτελέσεις κάποιο tool, ρώτα τον χρήστη βήμα-βήμα για ΟΛΕΣ τις σημαντικές παραμέτρους
- Για create_task: ρώτα project (δώσε επιλογές), τίτλο, περιγραφή, προτεραιότητα, deadline, υπεύθυνο
- Για create_project: ρώτα όνομα, πελάτη, budget, ημερομηνίες, περιγραφή
- Για create_brief: ρώτα τύπο, τίτλο, project, πελάτη
- Για create_client: ρώτα όνομα, email, τηλέφωνο, διεύθυνση
- Για create_calendar_event: ρώτα τίτλο, ημερομηνία/ώρα, τύπο, τοποθεσία/link, συμμετέχοντες
- Για log_time_entry: ρώτα project, task, διάρκεια, περιγραφή
- Για request_leave: ρώτα τύπο, ημερομηνίες, αιτία
- ΠΑΝΤΑ δείξε preview/σύνοψη πριν εκτελέσεις, με κουμπί επιβεβαίωσης
- Μετά την εκτέλεση, δείξε σύνοψη αποτελέσματος

Διαδραστικές Επιλογές:
Όταν χρειάζεται επιλογή, χρησιμοποίησε :::actions blocks αντί να ρωτάς με κείμενο.
Format:
:::actions
[{"type":"button","label":"Επιλογή 1","action":"select","data":{"key":"value"}},{"type":"button","label":"Επιλογή 2","action":"select","data":{"key":"value2"}}]
:::

Τύποι actions: button (κουμπί), confirm (Ναι/Όχι), link (πλοήγηση, χρειάζεται href), select (dropdown, χρειάζεται options array).

Download αρχείων:
Όταν δημιουργείς αναφορά/CSV, χρησιμοποίησε :::download block:
:::download
{"filename":"report.csv","content_type":"text/csv","data":"base64_encoded_content"}
:::

Daily Briefing:
Αν είναι η πρώτη αλληλεπίδραση (μόνο 1 μήνυμα χρήστη) ή ο χρήστης χαιρετά ή ρωτά "τι έχω σήμερα", κάλεσε το tool get_daily_briefing και παρουσίασε ένα structured briefing:
- 📋 Tasks σήμερα / Overdue tasks
- 📅 Σημερινά meetings
- ⚠️ Projects σε κίνδυνο
- 💡 Προτεινόμενες ενέργειες
${alertParts.length > 0 ? `\nProactive Alerts:\n${alertParts.join("\n")}\nΑν ο χρήστης ξεκινάει νέα συνομιλία ή ρωτάει γενικά, ανέφερε αυτά τα alerts φυσικά στη συνομιλία.` : ""}
${pageContext}

Γλώσσα: Μιλάς πάντα ελληνικά εκτός αν σε ρωτήσουν σε άλλη γλώσσα.
Αν δεν μπορείς να κάνεις κάτι, εξήγησε γιατί.
Αν η ενέργεια αποτύχει (π.χ. λόγω δικαιωμάτων), ενημέρωσε τον χρήστη.
Να είσαι φιλικός, αποτελεσματικός και συνοπτικός.
Χρησιμοποίησε markdown στις απαντήσεις σου.

Αν ο χρήστης αναφέρει κάποιον/κάτι με @[Όνομα](type:id), αυτό σημαίνει ότι αναφέρεται σε συγκεκριμένο entity. Χρησιμοποίησε το id για να το βρεις.

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
