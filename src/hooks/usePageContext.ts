import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface PageContext {
  pageName: string;
  pageType: string;
  entityId?: string;
  pageData: Record<string, any>;
}

const PAGE_NAMES: Record<string, string> = {
  "/": "My Work",
  "/work": "Work",
  "/dashboards": "Dashboards",
  "/calendar": "Calendar",
  "/timesheets": "Timesheets",
  "/financials": "Financials",
  "/reports": "Reports",
  "/clients": "Clients",
  "/hr": "HR",
  "/files": "Files",
  "/chat": "Chat",
  "/contacts": "Contacts",
  "/inbox": "Inbox",
  "/brain": "Brain",
  "/knowledge": "Knowledge Base",
  "/settings": "Settings",
  "/leaderboard": "Leaderboard",
  "/governance": "Governance",
  "/blueprints": "Blueprints",
  "/pricing": "Pricing",
  "/workflows": "Workflows",
  "/media-planning": "Media Planning",
};

export function usePageContext(): PageContext {
  const location = useLocation();
  const [context, setContext] = useState<PageContext>({
    pageName: "App",
    pageType: "general",
    pageData: {},
  });

  useEffect(() => {
    const path = location.pathname;

    // Match route patterns
    const taskMatch = path.match(/^\/tasks\/([^/]+)$/);
    const projectMatch = path.match(/^\/projects\/([^/]+)$/);
    const clientMatch = path.match(/^\/clients\/([^/]+)$/);
    const articleMatch = path.match(/^\/knowledge\/articles\/([^/]+)$/);

    if (taskMatch) {
      fetchTaskContext(taskMatch[1]);
    } else if (projectMatch) {
      fetchProjectContext(projectMatch[1]);
    } else if (clientMatch) {
      fetchClientContext(clientMatch[1]);
    } else if (articleMatch) {
      fetchArticleContext(articleMatch[1]);
    } else if (path === "/brain") {
      fetchBrainContext();
    } else if (path === "/calendar") {
      fetchCalendarContext();
    } else if (path === "/timesheets") {
      fetchTimesheetContext();
    } else {
      // Static page
      const name = PAGE_NAMES[path] || path;
      setContext({ pageName: name, pageType: "general", pageData: {} });
    }
  }, [location.pathname]);

  async function fetchTaskContext(taskId: string) {
    const [taskRes, commentsRes, subtasksRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, description, assigned_to, project_id, projects(name), profiles!tasks_assigned_to_fkey(full_name)")
        .eq("id", taskId)
        .single(),
      supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("task_id", taskId),
      supabase
        .from("tasks")
        .select("id, title, status", { count: "exact" })
        .eq("parent_task_id", taskId),
    ]);

    const task = taskRes.data;
    if (!task) {
      setContext({ pageName: "Task", pageType: "task", entityId: taskId, pageData: {} });
      return;
    }

    setContext({
      pageName: `Task: ${task.title}`,
      pageType: "task",
      entityId: taskId,
      pageData: {
        title: task.title,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        description: task.description?.substring(0, 500),
        assigned_to: (task as any).profiles?.full_name || null,
        project_name: (task as any).projects?.name || null,
        project_id: task.project_id,
        comments_count: commentsRes.count || 0,
        subtasks_count: subtasksRes.count || 0,
        subtasks_completed: (subtasksRes.data || []).filter((s: any) => s.status === "done").length,
      },
    });
  }

  async function fetchProjectContext(projectId: string) {
    const [projectRes, taskCountsRes, teamRes] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, status, budget, progress, start_date, end_date, client_id, clients(name)")
        .eq("id", projectId)
        .single(),
      supabase
        .from("tasks")
        .select("status")
        .eq("project_id", projectId),
      supabase
        .from("project_user_access")
        .select("user_id, role, profiles(full_name)")
        .eq("project_id", projectId)
        .limit(15),
    ]);

    const project = projectRes.data;
    if (!project) {
      setContext({ pageName: "Project", pageType: "project", entityId: projectId, pageData: {} });
      return;
    }

    const tasks = taskCountsRes.data || [];
    const tasksByStatus: Record<string, number> = {};
    tasks.forEach((t: any) => {
      tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
    });

    setContext({
      pageName: `Project: ${project.name}`,
      pageType: "project",
      entityId: projectId,
      pageData: {
        name: project.name,
        status: project.status,
        budget: project.budget,
        net_budget: project.net_budget,
        progress: project.progress,
        start_date: project.start_date,
        end_date: project.end_date,
        client_name: (project as any).clients?.name || null,
        client_id: project.client_id,
        total_tasks: tasks.length,
        tasks_by_status: tasksByStatus,
        team: (teamRes.data || []).map((m: any) => ({
          name: m.profiles?.full_name,
          role: m.role,
        })),
      },
    });
  }

  async function fetchClientContext(clientId: string) {
    const [clientRes, projectsRes] = await Promise.all([
      supabase
        .from("clients")
        .select("id, name, contact_email, contact_phone, sector, status, tags")
        .eq("id", clientId)
        .single(),
      supabase
        .from("projects")
        .select("id, name, status")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const client = clientRes.data;
    if (!client) {
      setContext({ pageName: "Client", pageType: "client", entityId: clientId, pageData: {} });
      return;
    }

    const projects = projectsRes.data || [];
    const activeProjects = projects.filter((p: any) => p.status === "active");

    setContext({
      pageName: `Client: ${client.name}`,
      pageType: "client",
      entityId: clientId,
      pageData: {
        name: client.name,
        email: client.contact_email,
        phone: client.contact_phone,
        sector: client.sector,
        status: client.status,
        tags: client.tags,
        total_projects: projects.length,
        active_projects: activeProjects.length,
        recent_projects: projects.slice(0, 5).map((p: any) => ({ name: p.name, status: p.status })),
      },
    });
  }

  async function fetchArticleContext(articleId: string) {
    const [articleRes, backlinksRes] = await Promise.all([
      supabase
        .from("kb_articles")
        .select("id, title, body, tags, article_type, status, created_at")
        .eq("id", articleId)
        .single(),
      supabase
        .from("kb_articles")
        .select("id, title")
        .ilike("body", `%[[%]]%`)
        .limit(20),
    ]);

    const article = articleRes.data;
    if (!article) {
      setContext({ pageName: "Article", pageType: "article", entityId: articleId, pageData: {} });
      return;
    }

    // Count backlinks that reference this article's title
    const backlinks = (backlinksRes.data || []).filter(
      (a: any) => a.id !== articleId && a.body?.includes(`[[${article.title}]]`)
    );

    setContext({
      pageName: `Article: ${article.title}`,
      pageType: "article",
      entityId: articleId,
      pageData: {
        title: article.title,
        type: article.article_type,
        status: article.status,
        tags: article.tags,
        word_count: article.body?.split(/\s+/).length || 0,
        backlinks_count: backlinks.length,
      },
    });
  }

  async function fetchBrainContext() {
    const { data } = await supabase
      .from("brain_insights")
      .select("id, title, priority, category")
      .eq("is_dismissed", false)
      .order("created_at", { ascending: false })
      .limit(5);

    setContext({
      pageName: "Brain",
      pageType: "brain",
      pageData: {
        latest_insights: (data || []).map((i: any) => ({
          title: i.title,
          priority: i.priority,
          category: i.category,
        })),
      },
    });
  }

  async function fetchCalendarContext() {
    const today = new Date().toISOString().split("T")[0];
    const todayStart = `${today}T00:00:00.000Z`;
    const todayEnd = `${today}T23:59:59.999Z`;

    const { data, count } = await supabase
      .from("calendar_events")
      .select("id, title, start_time, event_type", { count: "exact" })
      .gte("start_time", todayStart)
      .lte("start_time", todayEnd)
      .order("start_time")
      .limit(5);

    setContext({
      pageName: "Calendar",
      pageType: "calendar",
      pageData: {
        today_events_count: count || 0,
        upcoming: (data || []).slice(0, 3).map((e: any) => ({
          title: e.title,
          time: e.start_time,
          type: e.event_type,
        })),
      },
    });
  }

  async function fetchTimesheetContext() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const weekStart = monday.toISOString().split("T")[0];

    const { data } = await supabase
      .from("time_entries")
      .select("duration_minutes")
      .gte("start_time", `${weekStart}T00:00:00.000Z`);

    const totalMinutes = (data || []).reduce((sum: number, e: any) => sum + (e.duration_minutes || 0), 0);

    setContext({
      pageName: "Timesheets",
      pageType: "timesheets",
      pageData: {
        week_logged_hours: Math.round((totalMinutes / 60) * 10) / 10,
        week_logged_minutes: totalMinutes,
      },
    });
  }

  return context;
}
