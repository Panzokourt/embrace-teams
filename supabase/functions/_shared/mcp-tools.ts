// Tool registry for the MCP server. Each tool is company+user scoped.
// Imported by the mcp-server edge function and (optionally) by the secretary agent.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { McpTokenContext } from "../_shared/mcp-auth.ts";

export interface JsonSchema {
  type: "object";
  properties: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  requiredScope: string;
  handler: (
    args: Record<string, any>,
    ctx: McpTokenContext,
    admin: SupabaseClient,
  ) => Promise<unknown>;
}

// Helper to wrap tool output into MCP "content" format
export function asText(payload: unknown) {
  return {
    content: [{ type: "text", text: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2) }],
  };
}

// ============ TASKS ============
const taskFields = "id,title,status,priority,due_date,start_date,project_id,assigned_to,description,progress";

const listTasks: McpToolDef = {
  name: "list_tasks",
  description: "List tasks in the user's workspace. Filter by status, priority, or only those assigned to the current user.",
  requiredScope: "tasks:read",
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["todo", "in_progress", "in_review", "completed", "blocked"] },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
      assigned_to_me: { type: "boolean", description: "Only tasks assigned to me" },
      project_id: { type: "string", description: "Filter by project UUID" },
      due_within_days: { type: "number", description: "Only tasks due in the next N days" },
      limit: { type: "number", default: 25 },
    },
  },
  handler: async (args, ctx, admin) => {
    let q = admin.from("tasks").select(taskFields)
      .in("project_id", await visibleProjectIds(ctx, admin))
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(Math.min(Number(args.limit ?? 25), 100));
    if (args.status) q = q.eq("status", args.status);
    if (args.priority) q = q.eq("priority", args.priority);
    if (args.project_id) q = q.eq("project_id", args.project_id);
    if (args.assigned_to_me) q = q.eq("assigned_to", ctx.userId);
    if (args.due_within_days) {
      const until = new Date(Date.now() + Number(args.due_within_days) * 86400000).toISOString();
      q = q.lte("due_date", until);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return asText(data);
  },
};

const getTask: McpToolDef = {
  name: "get_task",
  description: "Fetch a single task by id with full details.",
  requiredScope: "tasks:read",
  inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
  handler: async (args, ctx, admin) => {
    const { data, error } = await admin.from("tasks").select("*").eq("id", args.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Task not found");
    await assertProjectAccess(ctx, admin, data.project_id);
    return asText(data);
  },
};

const createTask: McpToolDef = {
  name: "create_task",
  description: "Create a new task in a project.",
  requiredScope: "tasks:write",
  inputSchema: {
    type: "object",
    required: ["title", "project_id"],
    properties: {
      title: { type: "string" },
      project_id: { type: "string" },
      description: { type: "string" },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"], default: "medium" },
      due_date: { type: "string", description: "ISO date or datetime" },
      assigned_to: { type: "string", description: "User UUID. Defaults to me." },
    },
  },
  handler: async (args, ctx, admin) => {
    await assertProjectAccess(ctx, admin, args.project_id);
    const { data, error } = await admin.from("tasks").insert({
      title: args.title,
      project_id: args.project_id,
      description: args.description ?? null,
      priority: args.priority ?? "medium",
      due_date: args.due_date ?? null,
      assigned_to: args.assigned_to ?? ctx.userId,
      created_by: ctx.userId,
      status: "todo",
    }).select().single();
    if (error) throw new Error(error.message);
    return asText(data);
  },
};

const updateTask: McpToolDef = {
  name: "update_task",
  description: "Update fields on an existing task.",
  requiredScope: "tasks:write",
  inputSchema: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      status: { type: "string", enum: ["todo", "in_progress", "in_review", "completed", "blocked"] },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
      due_date: { type: "string" },
      assigned_to: { type: "string" },
      progress: { type: "number" },
    },
  },
  handler: async (args, ctx, admin) => {
    const { data: t } = await admin.from("tasks").select("project_id").eq("id", args.id).maybeSingle();
    if (!t) throw new Error("Task not found");
    await assertProjectAccess(ctx, admin, t.project_id);
    const patch: Record<string, any> = {};
    for (const k of ["title","description","status","priority","due_date","assigned_to","progress"]) {
      if (args[k] !== undefined) patch[k] = args[k];
    }
    const { data, error } = await admin.from("tasks").update(patch).eq("id", args.id).select().single();
    if (error) throw new Error(error.message);
    return asText(data);
  },
};

const completeTask: McpToolDef = {
  name: "complete_task",
  description: "Mark a task as completed.",
  requiredScope: "tasks:write",
  inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
  handler: async (args, ctx, admin) => {
    return updateTask.handler({ id: args.id, status: "completed", progress: 100 }, ctx, admin);
  },
};

// ============ PROJECTS ============
const listProjects: McpToolDef = {
  name: "list_projects",
  description: "List projects in the user's workspace.",
  requiredScope: "projects:read",
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string" },
      client_id: { type: "string" },
      limit: { type: "number", default: 50 },
    },
  },
  handler: async (args, ctx, admin) => {
    const ids = await visibleProjectIds(ctx, admin);
    let q = admin.from("projects")
      .select("id,name,status,client_id,progress,start_date,end_date,budget")
      .in("id", ids)
      .order("updated_at", { ascending: false })
      .limit(Math.min(Number(args.limit ?? 50), 200));
    if (args.status) q = q.eq("status", args.status);
    if (args.client_id) q = q.eq("client_id", args.client_id);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return asText(data);
  },
};

const getProject: McpToolDef = {
  name: "get_project",
  description: "Fetch a single project by id with details.",
  requiredScope: "projects:read",
  inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
  handler: async (args, ctx, admin) => {
    await assertProjectAccess(ctx, admin, args.id);
    const { data, error } = await admin.from("projects").select("*").eq("id", args.id).maybeSingle();
    if (error) throw new Error(error.message);
    return asText(data);
  },
};

// ============ CLIENTS ============
const listClients: McpToolDef = {
  name: "list_clients",
  description: "List clients in the user's company.",
  requiredScope: "clients:read",
  inputSchema: { type: "object", properties: { limit: { type: "number", default: 50 } } },
  handler: async (args, ctx, admin) => {
    const { data, error } = await admin.from("clients")
      .select("id,name,industry,website,email,phone,status")
      .eq("company_id", ctx.companyId)
      .order("name", { ascending: true })
      .limit(Math.min(Number(args.limit ?? 50), 200));
    if (error) throw new Error(error.message);
    return asText(data);
  },
};

const getClient: McpToolDef = {
  name: "get_client",
  description: "Fetch a single client with associated contacts.",
  requiredScope: "clients:read",
  inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
  handler: async (args, ctx, admin) => {
    const { data, error } = await admin.from("clients")
      .select("*, contacts(id,full_name,email,phone,job_title)")
      .eq("id", args.id).eq("company_id", ctx.companyId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Client not found in your workspace");
    return asText(data);
  },
};

// ============ TIME TRACKING ============
const startTimer: McpToolDef = {
  name: "start_timer",
  description: "Start a time tracking timer for a task. Stops any existing running timer for the user first.",
  requiredScope: "time:write",
  inputSchema: {
    type: "object",
    required: ["task_id"],
    properties: { task_id: { type: "string" }, description: { type: "string" } },
  },
  handler: async (args, ctx, admin) => {
    const { data: t } = await admin.from("tasks").select("project_id").eq("id", args.task_id).maybeSingle();
    if (!t) throw new Error("Task not found");
    await assertProjectAccess(ctx, admin, t.project_id);
    // stop running
    const { data: running } = await admin.from("time_entries").select("id,start_time")
      .eq("user_id", ctx.userId).eq("is_running", true).maybeSingle();
    if (running) {
      const minutes = Math.max(1, Math.round((Date.now() - new Date(running.start_time).getTime()) / 60000));
      await admin.from("time_entries").update({
        is_running: false, end_time: new Date().toISOString(), duration_minutes: minutes,
      }).eq("id", running.id);
    }
    const { data, error } = await admin.from("time_entries").insert({
      user_id: ctx.userId,
      task_id: args.task_id,
      project_id: t.project_id,
      start_time: new Date().toISOString(),
      is_running: true,
      description: args.description ?? null,
    }).select().single();
    if (error) throw new Error(error.message);
    return asText(data);
  },
};

const stopTimer: McpToolDef = {
  name: "stop_timer",
  description: "Stop the user's currently running timer. Returns the recorded entry.",
  requiredScope: "time:write",
  inputSchema: { type: "object", properties: {} },
  handler: async (_args, ctx, admin) => {
    const { data: running } = await admin.from("time_entries").select("id,start_time")
      .eq("user_id", ctx.userId).eq("is_running", true).maybeSingle();
    if (!running) return asText({ message: "No active timer." });
    const minutes = Math.max(1, Math.round((Date.now() - new Date(running.start_time).getTime()) / 60000));
    const { data, error } = await admin.from("time_entries").update({
      is_running: false, end_time: new Date().toISOString(), duration_minutes: minutes,
    }).eq("id", running.id).select().single();
    if (error) throw new Error(error.message);
    return asText(data);
  },
};

const getActiveTimer: McpToolDef = {
  name: "get_active_timer",
  description: "Get the user's currently running timer (if any).",
  requiredScope: "time:read",
  inputSchema: { type: "object", properties: {} },
  handler: async (_args, ctx, admin) => {
    const { data } = await admin.from("time_entries")
      .select("id,task_id,project_id,start_time,description, tasks(title)")
      .eq("user_id", ctx.userId).eq("is_running", true).maybeSingle();
    return asText(data ?? { message: "No active timer." });
  },
};

const logTimeEntry: McpToolDef = {
  name: "log_time_entry",
  description: "Log a completed time entry with explicit duration (in minutes).",
  requiredScope: "time:write",
  inputSchema: {
    type: "object",
    required: ["task_id", "duration_minutes"],
    properties: {
      task_id: { type: "string" },
      duration_minutes: { type: "number" },
      started_at: { type: "string" },
      description: { type: "string" },
    },
  },
  handler: async (args, ctx, admin) => {
    const { data: t } = await admin.from("tasks").select("project_id").eq("id", args.task_id).maybeSingle();
    if (!t) throw new Error("Task not found");
    await assertProjectAccess(ctx, admin, t.project_id);
    const start = args.started_at ? new Date(args.started_at) : new Date(Date.now() - args.duration_minutes * 60000);
    const end = new Date(start.getTime() + args.duration_minutes * 60000);
    const { data, error } = await admin.from("time_entries").insert({
      user_id: ctx.userId,
      task_id: args.task_id,
      project_id: t.project_id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_minutes: args.duration_minutes,
      is_running: false,
      description: args.description ?? null,
    }).select().single();
    if (error) throw new Error(error.message);
    return asText(data);
  },
};

// ============ KNOWLEDGE BASE ============
const searchKb: McpToolDef = {
  name: "search_kb",
  description: "Full-text search the knowledge base / wiki for articles in the user's company.",
  requiredScope: "kb:read",
  inputSchema: {
    type: "object",
    required: ["query"],
    properties: { query: { type: "string" }, limit: { type: "number", default: 8 } },
  },
  handler: async (args, ctx, admin) => {
    const { data, error } = await admin.from("kb_articles")
      .select("id,title,article_type,tags,status,updated_at")
      .eq("company_id", ctx.companyId)
      .eq("status", "published")
      .or(`title.ilike.%${String(args.query).replace(/%/g, "")}%,body.ilike.%${String(args.query).replace(/%/g, "")}%`)
      .limit(Math.min(Number(args.limit ?? 8), 25));
    if (error) throw new Error(error.message);
    return asText(data);
  },
};

const getKbArticle: McpToolDef = {
  name: "get_kb_article",
  description: "Fetch a knowledge base article by id, including body.",
  requiredScope: "kb:read",
  inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
  handler: async (args, ctx, admin) => {
    const { data, error } = await admin.from("kb_articles")
      .select("id,title,body,article_type,tags,updated_at,status")
      .eq("id", args.id).eq("company_id", ctx.companyId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Article not found");
    return asText(data);
  },
};

// ============ Helpers ============
async function visibleProjectIds(ctx: McpTokenContext, admin: SupabaseClient): Promise<string[]> {
  const { data } = await admin.rpc("get_visible_projects", { p_user_id: ctx.userId });
  if (Array.isArray(data) && data.length > 0) {
    return data.map((r: any) => (typeof r === "string" ? r : r.get_visible_projects ?? r.id)).filter(Boolean);
  }
  // Fallback to all projects in the company
  const { data: ps } = await admin.from("projects").select("id").eq("company_id", ctx.companyId);
  return (ps ?? []).map((p) => p.id);
}

async function assertProjectAccess(ctx: McpTokenContext, admin: SupabaseClient, projectId: string) {
  const ids = await visibleProjectIds(ctx, admin);
  if (!ids.includes(projectId)) throw new Error("Access denied for this project");
}

export const ALL_TOOLS: McpToolDef[] = [
  listTasks, getTask, createTask, updateTask, completeTask,
  listProjects, getProject,
  listClients, getClient,
  startTimer, stopTimer, getActiveTimer, logTimeEntry,
  searchKb, getKbArticle,
];
