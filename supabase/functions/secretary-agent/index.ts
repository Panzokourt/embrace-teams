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
  // ── SMART INTAKE & PLANNING TOOLS ──
  {
    type: "function",
    function: {
      name: "smart_project_plan",
      description: "Use AI to generate a complete project plan (deliverables, tasks, team roles) from a natural language description. Returns a structured plan for preview before execution.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Natural language description of the project/campaign (e.g. 'SEO campaign for client X, budget 5000€, 3 months')" },
          client_id: { type: "string", description: "Client ID if known" },
          budget: { type: "number", description: "Total budget in euros" },
          duration_months: { type: "number", description: "Duration in months" },
          template_hint: { type: "string", description: "Optional template hint (e.g. 'seo', 'social_media', 'branding')" },
        },
        required: ["description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_project_plan",
      description: "Execute a previously generated project plan: creates project, deliverables, tasks, and team assignments in the database",
      parameters: {
        type: "object",
        properties: {
          plan: {
            type: "object",
            description: "The plan object from smart_project_plan",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              deliverables: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    budget_pct: { type: "number" },
                    tasks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          priority: { type: "string" },
                          days_offset_start: { type: "number" },
                          days_offset_due: { type: "number" },
                          estimated_hours: { type: "number" },
                          role_hint: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
              suggested_roles: { type: "array", items: { type: "string" } },
            },
          },
          client_id: { type: "string", description: "Client ID" },
          budget: { type: "number", description: "Total budget" },
          start_date: { type: "string", description: "Start date YYYY-MM-DD (defaults to today)" },
          team_members: {
            type: "array",
            items: {
              type: "object",
              properties: {
                user_id: { type: "string" },
                role: { type: "string" },
              },
            },
            description: "Team members to assign",
          },
        },
        required: ["plan"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_uploaded_file",
      description: "Analyze uploaded file content (CSV, text, JSON, etc). Use when user uploads a file and you need to extract insights or structured data from it.",
      parameters: {
        type: "object",
        properties: {
          file_content: { type: "string", description: "The text content of the file (provided by the user message)" },
          file_name: { type: "string", description: "Original file name" },
          analysis_type: { type: "string", enum: ["summarize", "extract_data", "find_patterns"], description: "Type of analysis to perform" },
        },
        required: ["file_content", "file_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_risk_radar",
      description: "Comprehensive risk analysis: overdue tasks, budget overruns, unassigned tasks, stale projects, team capacity issues. Returns a structured risk report.",
      parameters: { type: "object", properties: {} },
    },
  },
  // ── MEMORY TOOLS ──
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Save an important fact, file analysis summary, decision, or user preference to persistent memory. Call this after analyzing files, making decisions, or learning user preferences. This helps you remember across conversations. Always include project_id or client_id when the memory is related to a specific project or client.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["general", "file_analysis", "decision", "preference", "project_context"], description: "Memory category" },
          key: { type: "string", description: "Short identifier, e.g. 'creative_brief_govgr' or 'user_prefers_greek'" },
          content: { type: "string", description: "The memory content - summary, key findings, decisions made" },
          metadata: { type: "object", description: "Optional metadata (file names, entity IDs, etc.)" },
          project_id: { type: "string", description: "Project UUID if this memory relates to a specific project" },
          client_id: { type: "string", description: "Client UUID if this memory relates to a specific client" },
        },
        required: ["category", "key", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recall_memory",
      description: "Search your persistent memory for relevant information. Use when the user references something discussed before, asks about previous analyses, or you need context from past interactions.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          category: { type: "string", enum: ["general", "file_analysis", "decision", "preference", "project_context"], description: "Optional category filter" },
          project_id: { type: "string", description: "Optional project UUID to filter memories for a specific project" },
          client_id: { type: "string", description: "Optional client UUID to filter memories for a specific client" },
          limit: { type: "number", description: "Max results (default 10)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_past_chats",
      description: "Search through previous Secretary conversations for relevant context. Use when the user says 'we discussed this before' or you need to find past conversation details.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_chat_channels",
      description: "Search through team chat channels for relevant messages. Use when the user asks about team discussions or you need context from internal communications.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        required: ["query"],
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
          created_by: userId,
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
        // Check for existing client with same name first
        const { data: existingClients } = await supabase
          .from("clients")
          .select("id, name")
          .eq("company_id", companyId)
          .ilike("name", args.name)
          .limit(3);
        if (existingClients && existingClients.length > 0) {
          return { 
            warning: true,
            message: `Found existing client(s) with similar name: ${existingClients.map((c: any) => `"${c.name}" (id: ${c.id})`).join(", ")}. Use their ID instead of creating a duplicate, or confirm creation.`,
            existing_clients: existingClients,
          };
        }
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
        // Check for existing client first if name is provided
        if (args.client_id) {
          const { data: existingClient } = await supabase.from("clients").select("id, name").eq("id", args.client_id).single();
          if (!existingClient) {
            return { error: `Client not found with id: ${args.client_id}` };
          }
        }
        const { data, error } = await supabase.from("projects").insert({
          name: args.name,
          description: args.description || null,
          client_id: args.client_id || null,
          budget: args.budget || null,
          start_date: args.start_date || null,
          end_date: args.end_date || null,
          status: args.status || "active",
          company_id: companyId,
          created_by: userId,
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

      // ── BRAIN TOOL EXECUTORS ──

      case "run_brain_analysis": {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const resp = await fetch(`${supabaseUrl}/functions/v1/brain-analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            ...(args.focus ? {} : {}),
          },
          body: JSON.stringify({ focus: args.focus || null }),
        });
        if (!resp.ok) {
          const errText = await resp.text();
          return { error: `Brain analysis failed: ${errText}` };
        }
        const brainResult = await resp.json();
        // Fetch the latest insights generated
        const { data: newInsights } = await supabase
          .from("brain_insights")
          .select("id, title, body, category, priority, neuro_tactic")
          .eq("company_id", companyId)
          .eq("is_dismissed", false)
          .order("created_at", { ascending: false })
          .limit(5);
        return {
          success: true,
          message: "Brain analysis completed",
          insights_generated: (newInsights || []).length,
          top_insights: (newInsights || []).map((i: any) => ({
            id: i.id,
            title: i.title,
            category: i.category,
            priority: i.priority,
            summary: i.body?.substring(0, 200),
            neuro_tactic: i.neuro_tactic,
          })),
        };
      }

      case "get_brain_insights": {
        let q = supabase
          .from("brain_insights")
          .select("id, title, body, category, priority, evidence, neuro_tactic, neuro_rationale, created_at, is_actioned")
          .eq("company_id", companyId)
          .eq("is_dismissed", false)
          .order("created_at", { ascending: false })
          .limit(args.limit || 10);
        if (args.category) q = q.eq("category", args.category);
        if (args.priority) q = q.eq("priority", args.priority);
        const { data, error } = await q;
        if (error) throw error;
        // If entity_id filter, do client-side filtering on evidence JSONB
        let insights = data || [];
        if (args.entity_id) {
          insights = insights.filter((i: any) => {
            const ev = i.evidence;
            if (!ev) return false;
            const evStr = JSON.stringify(ev);
            return evStr.includes(args.entity_id);
          });
        }
        return { insights, count: insights.length };
      }

      case "action_brain_insight": {
        // Fetch the insight first
        const { data: insight, error: insError } = await supabase
          .from("brain_insights")
          .select("id, title, body, category, evidence")
          .eq("id", args.insight_id)
          .single();
        if (insError || !insight) return { error: "Insight not found" };

        if (args.action_type === "dismiss") {
          await supabase.from("brain_insights").update({ is_dismissed: true }).eq("id", args.insight_id);
          return { success: true, message: "Insight dismissed" };
        }

        if (args.action_type === "note") {
          await supabase.from("brain_insights").update({ is_actioned: true }).eq("id", args.insight_id);
          return { success: true, message: `Note recorded for insight: ${insight.title}` };
        }

        if (args.action_type === "create_project") {
        const { data: proj, error: projErr } = await supabase.from("projects").insert({
            name: insight.title,
            description: insight.body,
            status: "lead",
            company_id: companyId,
            created_by: userId,
          }).select("id, name, status").single();
          if (projErr) throw projErr;
          await supabase.from("project_user_access").insert({ project_id: proj.id, user_id: userId, role: "project_lead" }).select().maybeSingle();
          await supabase.from("brain_insights").update({ is_actioned: true }).eq("id", args.insight_id);
          return { success: true, project: proj, message: `Project "${proj.name}" created from insight` };
        }

        if (args.action_type === "create_task") {
          if (!args.project_id) return { error: "project_id is required for create_task" };
          const taskTitle = args.task_title || insight.title;
          const { data: task, error: taskErr } = await supabase.from("tasks").insert({
            project_id: args.project_id,
            title: taskTitle,
            description: insight.body,
            status: "todo",
            priority: "high",
            assigned_to: userId,
            created_by: userId,
          }).select("id, title, status").single();
          if (taskErr) throw taskErr;
          await supabase.from("brain_insights").update({ is_actioned: true }).eq("id", args.insight_id);
          return { success: true, task, message: `Task "${task.title}" created from insight` };
        }

        return { error: "Unknown action_type" };
      }

      // ── SMART INTAKE & PLANNING EXECUTORS ──

      case "smart_project_plan": {
        const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
        if (!ANTHROPIC_API_KEY) return { error: "AI not configured" };

        const planPrompt = `Είσαι expert project planner για agency επικοινωνίας/marketing.
Δημιούργησε ένα πλήρες project plan βασισμένο στην περιγραφή.

Περιγραφή: ${args.description}
${args.budget ? `Budget: €${args.budget}` : ""}
${args.duration_months ? `Διάρκεια: ${args.duration_months} μήνες` : ""}
${args.template_hint ? `Τύπος: ${args.template_hint}` : ""}

Επέστρεψε ένα JSON object μέσω του tool output_plan.

Κανόνες:
- 3-6 deliverables ανάλογα πολυπλοκότητα
- 2-5 tasks ανά deliverable
- budget_pct να αθροίζουν σε 100
- days_offset relative to project start
- Ρεαλιστικά estimated_hours
- role_hint πρέπει να αντιστοιχεί σε ρόλους agency (project_lead, designer, copywriter, seo_specialist, social_media_manager, developer, account_manager, media_planner)`;

        const planResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 8192,
            messages: [{ role: "user", content: planPrompt }],
            tools: [{
              name: "output_plan",
              description: "Output the structured project plan",
              input_schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  deliverables: { type: "array", items: { type: "object", properties: { name: { type: "string" }, budget_pct: { type: "number" }, tasks: { type: "array", items: { type: "object", properties: { title: { type: "string" }, priority: { type: "string" }, days_offset_start: { type: "number" }, days_offset_due: { type: "number" }, estimated_hours: { type: "number" }, role_hint: { type: "string" } } } } } } },
                  suggested_roles: { type: "array", items: { type: "string" } },
                },
                required: ["name", "description", "deliverables", "suggested_roles"],
              },
            }],
            tool_choice: { type: "tool", name: "output_plan" },
          }),
        });

        if (!planResp.ok) {
          const errText = await planResp.text();
          console.error("Plan AI error:", errText);
          return { error: "Failed to generate plan" };
        }

        const planResult = await planResp.json();
        // Find tool_use block in Anthropic response
        const toolUseBlock = planResult.content?.find((b: any) => b.type === "tool_use" && b.name === "output_plan");
        if (!toolUseBlock) return { error: "AI did not return a plan" };

        const plan = toolUseBlock.input;

        // Enrich with budget amounts
        if (args.budget && plan.deliverables) {
          for (const d of plan.deliverables) {
            d.budget_amount = Math.round((d.budget_pct / 100) * args.budget);
          }
        }

        const totalTasks = (plan.deliverables || []).reduce((s: number, d: any) => s + (d.tasks?.length || 0), 0);
        const totalHours = (plan.deliverables || []).reduce((s: number, d: any) =>
          s + (d.tasks || []).reduce((ts: number, t: any) => ts + (t.estimated_hours || 0), 0), 0);

        return {
          success: true,
          plan,
          summary: {
            deliverables_count: plan.deliverables?.length || 0,
            total_tasks: totalTasks,
            total_estimated_hours: totalHours,
            suggested_roles: plan.suggested_roles || [],
            budget: args.budget || null,
            duration_months: args.duration_months || null,
          },
          message: "Plan generated. Present it to the user and ask for confirmation before executing with execute_project_plan.",
        };
      }

      case "execute_project_plan": {
        const plan = args.plan;
        if (!plan || !plan.name) return { error: "Invalid plan object" };

        const startDate = args.start_date || new Date().toISOString().split("T")[0];
        const startMs = new Date(startDate).getTime();

        // Calculate end date from max days_offset_due
        let maxDayOffset = 30;
        for (const d of plan.deliverables || []) {
          for (const t of d.tasks || []) {
            if (t.days_offset_due > maxDayOffset) maxDayOffset = t.days_offset_due;
          }
        }
        const endDate = new Date(startMs + maxDayOffset * 86400000).toISOString().split("T")[0];

        // 1. Create project
        const { data: project, error: projErr } = await supabase.from("projects").insert({
          name: plan.name,
          description: plan.description || null,
          client_id: args.client_id || null,
          budget: args.budget || null,
          start_date: startDate,
          end_date: endDate,
          status: "active",
          company_id: companyId,
          created_by: userId,
        }).select("id, name, status, budget").single();
        if (projErr) throw projErr;

        // 2. Add creator to team
        await supabase.from("project_user_access").insert({
          project_id: project.id, user_id: userId, role: "project_lead",
        }).select().maybeSingle();

        // 3. Add team members
        if (args.team_members && args.team_members.length > 0) {
          const teamRows = args.team_members.map((m: any) => ({
            project_id: project.id,
            user_id: m.user_id,
            role: m.role || "member",
          }));
          await supabase.from("project_user_access").upsert(teamRows, { onConflict: "project_id,user_id" });
        }

        // 4. Create deliverables and tasks
        let totalTasksCreated = 0;
        let totalDeliverablesCreated = 0;

        for (const del of plan.deliverables || []) {
          const delBudget = args.budget ? Math.round((del.budget_pct / 100) * args.budget) : null;
          const maxTaskDue = Math.max(...(del.tasks || []).map((t: any) => t.days_offset_due || 30));
          const delDueDate = new Date(startMs + maxTaskDue * 86400000).toISOString().split("T")[0];

          const { data: deliverable, error: delErr } = await supabase.from("deliverables").insert({
            project_id: project.id,
            name: del.name,
            budget: delBudget,
            due_date: delDueDate,
          }).select("id, name").single();
          if (delErr) { console.error("Deliverable error:", delErr); continue; }
          totalDeliverablesCreated++;

          for (const task of del.tasks || []) {
            const taskDue = new Date(startMs + (task.days_offset_due || 14) * 86400000).toISOString().split("T")[0];
            const { error: taskErr } = await supabase.from("tasks").insert({
              project_id: project.id,
              deliverable_id: deliverable.id,
              title: task.title,
              priority: task.priority || "medium",
              due_date: taskDue,
              estimated_hours: task.estimated_hours || null,
              status: "todo",
              created_by: userId,
            });
            if (!taskErr) totalTasksCreated++;
          }
        }

        return {
          success: true,
          project,
          created: {
            deliverables: totalDeliverablesCreated,
            tasks: totalTasksCreated,
            team_members: (args.team_members?.length || 0) + 1,
          },
          message: `Project "${project.name}" created with ${totalDeliverablesCreated} deliverables and ${totalTasksCreated} tasks.`,
        };
      }

      case "analyze_uploaded_file": {
        const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
        if (!ANTHROPIC_API_KEY) return { error: "AI not configured" };

        const content = args.file_content || "";
        const fileName = args.file_name || "unknown";
        const analysisType = args.analysis_type || "summarize";

        // Truncate if too long for AI context
        const maxChars = 30000;
        const truncatedContent = content.length > maxChars 
          ? content.slice(0, maxChars) + `\n\n[Truncated: showing first ${maxChars} of ${content.length} characters]`
          : content;

        const analysisPrompt = `Analyze the following file content.
File name: ${fileName}
Analysis type: ${analysisType}

${analysisType === "summarize" ? "Provide a clear summary of the file contents. Identify key data points, structure, and notable patterns." : ""}
${analysisType === "extract_data" ? "Extract structured data from the file. Return key columns, rows, and any meaningful aggregations." : ""}
${analysisType === "find_patterns" ? "Find patterns, trends, anomalies, and actionable insights in the data." : ""}

File content:
\`\`\`
${truncatedContent}
\`\`\`

Respond in Greek. Be thorough but concise.`;

        const analysisResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            messages: [{ role: "user", content: analysisPrompt }],
          }),
        });

        if (!analysisResp.ok) {
          return { error: "Failed to analyze file" };
        }

        const analysisResult = await analysisResp.json();
        const analysis = analysisResult.content?.[0]?.text || "No analysis generated";

        return {
          success: true,
          file_name: fileName,
          analysis_type: analysisType,
          analysis,
          content_length: content.length,
          truncated: content.length > maxChars,
        };
      }

      case "get_risk_radar": {
        const today = new Date().toISOString().split("T")[0];
        const threeDaysLater = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
        const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();

        const [overdueRes, upcomingUnassignedRes, projectBudgetsRes, staleProjectsRes, capacityRes] = await Promise.all([
          // Overdue tasks grouped info
          supabase.from("tasks")
            .select("id, title, due_date, priority, project_id, projects(name), assigned_to, profiles!tasks_assigned_to_fkey(full_name)")
            .lt("due_date", today)
            .neq("status", "done")
            .neq("status", "cancelled")
            .order("due_date", { ascending: true })
            .limit(20),
          // Tasks due in 3 days without assignee
          supabase.from("tasks")
            .select("id, title, due_date, priority, project_id, projects(name)")
            .gte("due_date", today)
            .lte("due_date", threeDaysLater)
            .is("assigned_to", null)
            .neq("status", "done")
            .neq("status", "cancelled")
            .limit(20),
          // Active projects with budgets and expenses
          supabase.from("projects")
            .select("id, name, budget, status")
            .eq("company_id", companyId)
            .eq("status", "active")
            .not("budget", "is", null),
          // Projects with no task updates in 14+ days
          supabase.from("projects")
            .select("id, name, status, updated_at")
            .eq("company_id", companyId)
            .eq("status", "active")
            .lt("updated_at", twoWeeksAgo)
            .limit(10),
          // Users with many open tasks
          supabase.rpc("get_user_company_id", { _user_id: userId }).then(async () => {
            const { data } = await supabase
              .from("tasks")
              .select("assigned_to, profiles!tasks_assigned_to_fkey(full_name)")
              .neq("status", "done")
              .neq("status", "cancelled")
              .not("assigned_to", "is", null);
            // Count tasks per user
            const counts: Record<string, { name: string; count: number }> = {};
            for (const t of data || []) {
              const uid = t.assigned_to;
              if (!counts[uid]) counts[uid] = { name: (t as any).profiles?.full_name || "Unknown", count: 0 };
              counts[uid].count++;
            }
            return Object.entries(counts)
              .filter(([_, v]) => v.count >= 10)
              .map(([uid, v]) => ({ user_id: uid, name: v.name, open_tasks: v.count }))
              .sort((a, b) => b.open_tasks - a.open_tasks);
          }),
        ]);

        // Check budget overruns
        const budgetOverruns: any[] = [];
        for (const proj of projectBudgetsRes.data || []) {
          if (!proj.budget) continue;
          const { data: expenses } = await supabase
            .from("expenses")
            .select("amount")
            .eq("project_id", proj.id);
          const totalExpenses = (expenses || []).reduce((s: number, e: any) => s + (e.amount || 0), 0);
          if (totalExpenses > proj.budget) {
            budgetOverruns.push({
              project_id: proj.id,
              project_name: proj.name,
              budget: proj.budget,
              total_expenses: totalExpenses,
              overrun_pct: Math.round(((totalExpenses - proj.budget) / proj.budget) * 100),
            });
          }
        }

        const risks: any[] = [];

        // Overdue tasks
        const overdueTasks = overdueRes.data || [];
        if (overdueTasks.length > 0) {
          risks.push({
            type: "overdue_tasks",
            severity: "high",
            title: `${overdueTasks.length} overdue task(s)`,
            details: overdueTasks.slice(0, 5).map((t: any) => ({
              task: t.title,
              due: t.due_date,
              project: t.projects?.name,
              assigned_to: (t as any).profiles?.full_name || "Unassigned",
            })),
          });
        }

        // Budget overruns
        if (budgetOverruns.length > 0) {
          risks.push({
            type: "budget_overrun",
            severity: "high",
            title: `${budgetOverruns.length} project(s) over budget`,
            details: budgetOverruns,
          });
        }

        // Upcoming unassigned
        const unassigned = upcomingUnassignedRes.data || [];
        if (unassigned.length > 0) {
          risks.push({
            type: "unassigned_urgent",
            severity: "medium",
            title: `${unassigned.length} task(s) due in 3 days without assignee`,
            details: unassigned.slice(0, 5).map((t: any) => ({
              task: t.title,
              due: t.due_date,
              project: t.projects?.name,
            })),
          });
        }

        // Stale projects
        const stale = staleProjectsRes.data || [];
        if (stale.length > 0) {
          risks.push({
            type: "stale_projects",
            severity: "medium",
            title: `${stale.length} project(s) with no activity for 14+ days`,
            details: stale.map((p: any) => ({ project: p.name, last_update: p.updated_at })),
          });
        }

        // Capacity issues
        const overloaded = await capacityRes;
        if (overloaded.length > 0) {
          risks.push({
            type: "capacity_overload",
            severity: "medium",
            title: `${overloaded.length} team member(s) with 10+ open tasks`,
            details: overloaded.slice(0, 5),
          });
        }

        return {
          success: true,
          risk_count: risks.length,
          risks,
          scanned_at: new Date().toISOString(),
        };
      }

      // ── MEMORY TOOL EXECUTORS ──

      case "save_memory": {
        // Upsert memory by key to avoid duplicates
        const { data: existing } = await supabase
          .from("secretary_memory")
          .select("id")
          .eq("user_id", userId)
          .eq("company_id", companyId)
          .eq("key", args.key)
          .limit(1)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("secretary_memory")
            .update({
              content: args.content,
              category: args.category || "general",
              metadata: args.metadata || {},
              project_id: args.project_id || null,
              client_id: args.client_id || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          if (error) throw error;
          return { success: true, action: "updated", key: args.key };
        } else {
          const { error } = await supabase.from("secretary_memory").insert({
            user_id: userId,
            company_id: companyId,
            category: args.category || "general",
            key: args.key,
            content: args.content,
            metadata: args.metadata || {},
            project_id: args.project_id || null,
            client_id: args.client_id || null,
          });
          if (error) throw error;
          return { success: true, action: "saved", key: args.key };
        }
      }

      case "recall_memory": {
        const limit = args.limit || 10;
        let q = supabase
          .from("secretary_memory")
          .select("id, category, key, content, metadata, created_at, updated_at")
          .eq("user_id", userId)
          .eq("company_id", companyId)
          .order("updated_at", { ascending: false })
          .limit(limit);

        if (args.category) q = q.eq("category", args.category);

        // Try full-text search first
        if (args.query) {
          const { data: ftsData } = await supabase
            .from("secretary_memory")
            .select("id, category, key, content, metadata, created_at, updated_at")
            .eq("user_id", userId)
            .eq("company_id", companyId)
            .textSearch("content", args.query, { type: "plain" })
            .order("updated_at", { ascending: false })
            .limit(limit);

          if (ftsData && ftsData.length > 0) {
            return { memories: ftsData, count: ftsData.length, search_type: "full_text" };
          }

          // Fallback: ilike search
          const { data: ilikeData } = await supabase
            .from("secretary_memory")
            .select("id, category, key, content, metadata, created_at, updated_at")
            .eq("user_id", userId)
            .eq("company_id", companyId)
            .or(`content.ilike.%${args.query}%,key.ilike.%${args.query}%`)
            .order("updated_at", { ascending: false })
            .limit(limit);

          return { memories: ilikeData || [], count: (ilikeData || []).length, search_type: "fuzzy" };
        }

        const { data, error } = await q;
        if (error) throw error;
        return { memories: data || [], count: (data || []).length };
      }

      case "search_past_chats": {
        const limit = args.limit || 20;
        // Search in secretary_messages using ilike
        const { data, error } = await supabase
          .from("secretary_messages")
          .select("id, conversation_id, role, content, created_at")
          .eq("role", "assistant")
          .ilike("content", `%${args.query}%`)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;

        // Filter to only conversations belonging to this user
        const convIds = [...new Set((data || []).map((m: any) => m.conversation_id))];
        const { data: userConvs } = await supabase
          .from("secretary_conversations")
          .select("id, title")
          .eq("user_id", userId)
          .in("id", convIds);

        const validConvIds = new Set((userConvs || []).map((c: any) => c.id));
        const convTitles: Record<string, string> = {};
        for (const c of userConvs || []) convTitles[c.id] = c.title;

        const filtered = (data || [])
          .filter((m: any) => validConvIds.has(m.conversation_id))
          .map((m: any) => ({
            ...m,
            conversation_title: convTitles[m.conversation_id] || "Untitled",
            content_preview: m.content.length > 300 ? m.content.slice(0, 300) + "..." : m.content,
          }));

        return { messages: filtered, count: filtered.length };
      }

      case "search_chat_channels": {
        const limit = args.limit || 20;
        // Use the existing search_chat_messages DB function
        const { data, error } = await supabase.rpc("search_chat_messages", {
          _query: args.query,
          _company_id: companyId,
          _limit: limit,
        });
        if (error) throw error;
        return { messages: data || [], count: (data || []).length };
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

    // Fetch Brain alerts and user memories in parallel
    const twoDaysAgo2 = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const [brainAlertsRes, memoriesRes] = await Promise.all([
      supabase
        .from("brain_insights")
        .select("id, title, category, priority, body")
        .eq("company_id", companyId)
        .eq("is_dismissed", false)
        .eq("is_actioned", false)
        .eq("priority", "high")
        .gte("created_at", twoDaysAgo2)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("secretary_memory")
        .select("category, key, content, updated_at")
        .eq("user_id", userId)
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false })
        .limit(15),
    ]);

    const brainAlerts = brainAlertsRes.data;
    const userMemories = memoriesRes.data || [];
    // (brain alerts already fetched above in parallel)

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

    // Brain alerts
    const brainAlertParts: string[] = [];
    if (brainAlerts && brainAlerts.length > 0) {
      brainAlertParts.push(`\nBrain Alerts (τελευταία 48h):`);
      for (const ba of brainAlerts) {
        brainAlertParts.push(`- [${ba.priority}/${ba.category}] ${ba.title} (id: ${ba.id})`);
      }
      brainAlertParts.push(`Αν σχετίζονται με αυτά που ρωτά ο χρήστης, ανέφερέ τα και πρότεινε "Θες να φτιάξω project/task γι' αυτό;"`);
    }

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
- Αν είναι σε /dashboard → προσφέρε γενική επισκόπηση
- Αν είναι σε /brain → πρότεινε ανάλυση Brain ή εμφάνιση insights`;
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

Inline Input (ζήτα στοιχεία):
Όταν θες να ρωτήσεις τον χρήστη για ένα πεδίο (κείμενο, αριθμό):
:::input
{"type":"text","label":"Όνομα project","field":"project_name","placeholder":"π.χ. Καμπάνια SEO"}
:::
ή
:::input
{"type":"number","label":"Budget (€)","field":"budget","placeholder":"5000"}
:::

Πίνακες δεδομένων:
Όταν δείχνεις λίστες (tasks, projects, clients, team members, expenses), χρησιμοποίησε :::table block:
:::table
{"headers":["Τίτλος","Status","Priority","Deadline"],"rows":[["SEO Audit","in_progress","high","2026-03-20"],["Content Plan","todo","medium","2026-03-25"]]}
:::

Progress bars:
:::progress
{"label":"Project Progress","value":75,"max":100}
:::

Charts (για οικονομικά/στατιστικά δεδομένα):
:::chart
{"type":"bar","title":"Έσοδα ανά πελάτη","data":[{"name":"Client A","value":5000},{"name":"Client B","value":3000}]}
:::
Υποστηριζόμενοι τύποι: bar, line, pie

Image preview:
:::image
{"url":"https://...","alt":"Screenshot"}
:::

File cards:
:::file
{"name":"report.pdf","url":"https://...","size":1024000}
:::

Download αρχείων:
Όταν δημιουργείς αναφορά/CSV, χρησιμοποίησε :::download block:
:::download
{"filename":"report.csv","content_type":"text/csv","data":"base64_encoded_content"}
:::

ΣΗΜΑΝΤΙΚΟ: Χρησιμοποίησε ΠΑΝΤΑ :::table αντί για markdown tables, :::progress αντί για text percentages, και :::chart όταν δείχνεις αριθμητικά δεδομένα. Αυτά κάνουν render ως πλούσια UI components.

Daily Briefing:
Αν είναι η πρώτη αλληλεπίδραση (μόνο 1 μήνυμα χρήστη) ή ο χρήστης χαιρετά ή ρωτά "τι έχω σήμερα", κάλεσε το tool get_daily_briefing και παρουσίασε ένα structured briefing:
- 📋 Tasks σήμερα / Overdue tasks
- 📅 Σημερινά meetings
- ⚠️ Projects σε κίνδυνο
- 💡 Προτεινόμενες ενέργειες
${alertParts.length > 0 ? `\nProactive Alerts:\n${alertParts.join("\n")}\nΑν ο χρήστης ξεκινάει νέα συνομιλία ή ρωτάει γενικά, ανέφερε αυτά τα alerts φυσικά στη συνομιλία.` : ""}
${brainAlertParts.length > 0 ? brainAlertParts.join("\n") : ""}
${pageContext}

Brain Integration:
- Μπορείς να τρέξεις AI ανάλυση Brain (run_brain_analysis) για fresh insights
- Μπορείς να δεις υπάρχοντα Brain insights (get_brain_insights)
- Μπορείς να μετατρέψεις insight σε project/task (action_brain_insight)
- Όταν παρουσιάζεις insight, πρότεινε actionable βήματα: "Θες να φτιάξω project/task γι' αυτό;"
- Αν ο χρήστης ρωτά "τι ρίσκα βλέπεις", "ανάλυσε τον πελάτη Χ", "τι λέει το Brain" → χρησιμοποίησε τα Brain tools

Smart Intake & Planning:
- Αν ο χρήστης περιγράφει ένα αίτημα/project σε φυσική γλώσσα (π.χ. "θέλω καμπάνια SEO για τον πελάτη Χ, budget 5000€, 3 μήνες"), χρησιμοποίησε smart_project_plan
- Παρουσίασε το πλάνο αναλυτικά (deliverables, tasks, timeline, roles) και ζήτα επιβεβαίωση πριν προχωρήσεις
- Μετά την επιβεβαίωση, χρησιμοποίησε execute_project_plan με το ίδιο plan object
- Αν ο χρήστης θέλει αλλαγές στο πλάνο, τροποποίησε και ξαναπαρουσίασε

Risk Radar:
- Αν ο χρήστης ρωτά "τι ρίσκα υπάρχουν", "τι πρέπει να προσέξω", "risk check", "risk radar" → get_risk_radar
- Στο daily briefing, αν υπάρχουν σοβαρά ρίσκα, ανέφερέ τα
- Παρουσίασε τα ρίσκα κατά severity (high πρώτα) με actionable suggestions

Γλώσσα: Μιλάς πάντα ελληνικά εκτός αν σε ρωτήσουν σε άλλη γλώσσα.
Αν δεν μπορείς να κάνεις κάτι, εξήγησε γιατί.
Αν η ενέργεια αποτύχει (π.χ. λόγω δικαιωμάτων), ενημέρωσε τον χρήστη.
Να είσαι φιλικός, αποτελεσματικός και συνοπτικός.
Χρησιμοποίησε markdown στις απαντήσεις σου.

Αν ο χρήστης αναφέρει κάποιον/κάτι με @[Όνομα](type:id), αυτό σημαίνει ότι αναφέρεται σε συγκεκριμένο entity. Χρησιμοποίησε το id για να το βρεις.

Memory & Context:
- Έχεις μόνιμη μνήμη (save_memory/recall_memory). Αποθήκευε σημαντικές πληροφορίες αυτόματα.
- Μετά από ανάλυση αρχείου, ΠΑΝΤΑ κάλεσε save_memory με category "file_analysis" και τα key findings.
- Μετά από σημαντική απόφαση χρήστη, κάλεσε save_memory με category "decision".
- Μπορείς να ψάξεις παλιές συνομιλίες (search_past_chats) και team chat channels (search_chat_channels).
- Αν ο χρήστης αναφέρει κάτι που συζητήθηκε πριν, χρησιμοποίησε recall_memory ή search_past_chats.
${userMemories.length > 0 ? `\nΑποθηκευμένη Μνήμη Χρήστη (${userMemories.length} εγγραφές):\n${userMemories.map((m: any) => `- [${m.category}] ${m.key}: ${m.content.length > 200 ? m.content.slice(0, 200) + "..." : m.content}`).join("\n")}` : ""}

Context δεδομένων χρήστη:
${contextParts.join("\n")}`;

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // Convert OpenAI-style tool definitions to Anthropic format
    const anthropicTools = toolDefinitions.map((t: any) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));

    // Build Anthropic messages (separate system, convert roles)
    // Filter out system messages from the conversation
    const anthropicMessages = messages.map((m: any) => ({
      role: m.role === "system" ? "user" : m.role,
      content: m.content,
    }));

    // SSE streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          let conversationMessages = [...anthropicMessages];

          // Tool calling loop (max 8 iterations)
          for (let i = 0; i < 8; i++) {
            const isToolLoop = i > 0;

            // Check if this might be the final call — use streaming
            const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 8192,
                system: systemPrompt,
                messages: conversationMessages,
                tools: anthropicTools,
                stream: true,
              }),
            });

            if (!aiResponse.ok) {
              if (aiResponse.status === 429) {
                send({ type: "error", text: "Πολλά αιτήματα. Δοκίμασε ξανά σε λίγο." });
              } else {
                const errText = await aiResponse.text();
                console.error("Anthropic API error:", aiResponse.status, errText);
                send({ type: "error", text: "Σφάλμα AI API" });
              }
              break;
            }

            // Parse SSE stream from Anthropic
            const reader = aiResponse.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let contentBlocks: any[] = [];
            let currentBlockIndex = -1;
            let currentBlockType = "";
            let currentToolName = "";
            let currentToolId = "";
            let textAccumulator = "";
            let inputJsonAccumulator = "";
            let stopReason = "";
            let hasToolUse = false;
            let streamedText = false;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });

              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6).trim();
                if (data === "[DONE]") continue;

                let event: any;
                try { event = JSON.parse(data); } catch { continue; }

                switch (event.type) {
                  case "content_block_start":
                    currentBlockIndex = event.index;
                    if (event.content_block?.type === "tool_use") {
                      currentBlockType = "tool_use";
                      currentToolName = event.content_block.name;
                      currentToolId = event.content_block.id;
                      inputJsonAccumulator = "";
                      hasToolUse = true;
                    } else if (event.content_block?.type === "text") {
                      currentBlockType = "text";
                      textAccumulator = "";
                    }
                    break;

                  case "content_block_delta":
                    if (event.delta?.type === "text_delta" && currentBlockType === "text") {
                      const text = event.delta.text;
                      textAccumulator += text;
                      // Stream text to client immediately
                      if (!hasToolUse || stopReason === "end_turn") {
                        send({ type: "delta", content: text });
                        streamedText = true;
                      }
                    } else if (event.delta?.type === "input_json_delta" && currentBlockType === "tool_use") {
                      inputJsonAccumulator += event.delta.partial_json || "";
                    }
                    break;

                  case "content_block_stop":
                    if (currentBlockType === "text") {
                      contentBlocks.push({ type: "text", text: textAccumulator });
                    } else if (currentBlockType === "tool_use") {
                      let parsedInput = {};
                      try { parsedInput = JSON.parse(inputJsonAccumulator); } catch { }
                      contentBlocks.push({
                        type: "tool_use",
                        id: currentToolId,
                        name: currentToolName,
                        input: parsedInput,
                      });
                    }
                    currentBlockType = "";
                    break;

                  case "message_delta":
                    if (event.delta?.stop_reason) {
                      stopReason = event.delta.stop_reason;
                    }
                    break;
                }
              }
            }

            // Check for tool use blocks
            const toolUseBlocks = contentBlocks.filter((b: any) => b.type === "tool_use");

            // If no tool calls or end_turn, we're done
            if (toolUseBlocks.length === 0 || stopReason === "end_turn") {
              // If we didn't stream text yet (e.g. text came before tool detection), send it now
              if (!streamedText) {
                const fullText = contentBlocks.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
                if (fullText) {
                  send({ type: "delta", content: fullText });
                }
              }
              const fullReply = contentBlocks.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
              send({ type: "done", reply: fullReply });
              break;
            }

            // We have tool calls — send status and execute them
            // First, if any text was streamed, we need to handle that
            // Add assistant message with all content blocks
            conversationMessages.push({
              role: "assistant",
              content: contentBlocks,
            });

            // Execute each tool call
            const toolResults: any[] = [];
            for (const toolBlock of toolUseBlocks) {
              const fnName = toolBlock.name;
              const fnArgs = toolBlock.input || {};

              // Send status to client
              const toolLabel = fnName.replace(/_/g, " ");
              send({ type: "status", text: `Εκτέλεση: ${toolLabel}...` });

              console.log(`Executing tool: ${fnName}`, fnArgs);
              const toolResult = await executeTool(supabase, userId, companyId, fnName, fnArgs);

              toolResults.push({
                type: "tool_result",
                tool_use_id: toolBlock.id,
                content: JSON.stringify(toolResult),
              });
            }

            conversationMessages.push({
              role: "user",
              content: toolResults,
            });

            // Reset for next iteration
            contentBlocks = [];
            textAccumulator = "";
            hasToolUse = false;
            streamedText = false;
          }
        } catch (e) {
          console.error("secretary-agent stream error:", e);
          const errMsg = e instanceof Error ? e.message : "Unknown error";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", text: errMsg })}\n\n`));
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    console.error("secretary-agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
