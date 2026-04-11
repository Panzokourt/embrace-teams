import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const taskKeys = {
  all: ['tasks'] as const,
  byProject: (projectId: string) => [...taskKeys.all, 'byProject', projectId] as const,
  byProjects: (projectIds: string[]) => [...taskKeys.all, 'byProjects', ...projectIds] as const,
  myTasks: (userId: string) => [...taskKeys.all, 'myTasks', userId] as const,
  stats: (projectIds: string[]) => [...taskKeys.all, 'stats', ...projectIds] as const,
};

export const taskQueries = {
  byProject: (projectId: string) =>
    queryOptions({
      queryKey: taskKeys.byProject(projectId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .order('sort_order');
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!projectId,
    }),

  byProjects: (projectIds: string[]) =>
    queryOptions({
      queryKey: taskKeys.byProjects(projectIds),
      queryFn: async () => {
        if (projectIds.length === 0) return [];
        const { data, error } = await supabase
          .from('tasks')
          .select('id, status, due_date, project_id')
          .in('project_id', projectIds);
        if (error) throw error;
        return data ?? [];
      },
      enabled: projectIds.length > 0,
    }),

  myTasks: (userId: string) =>
    queryOptions({
      queryKey: taskKeys.myTasks(userId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('tasks')
          .select('*, project:projects(name)')
          .eq('assigned_to', userId)
          .neq('status', 'completed')
          .order('due_date', { ascending: true });
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!userId,
    }),
};
