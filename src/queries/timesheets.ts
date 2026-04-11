import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const timesheetKeys = {
  all: ['timesheets'] as const,
  entries: () => [...timesheetKeys.all, 'entries'] as const,
  entriesList: (filters?: Record<string, string>) => [...timesheetKeys.entries(), filters ?? {}] as const,
  activeTimer: (userId: string) => [...timesheetKeys.all, 'activeTimer', userId] as const,
  byTask: (taskId: string) => [...timesheetKeys.all, 'byTask', taskId] as const,
  byProject: (projectId: string) => [...timesheetKeys.all, 'byProject', projectId] as const,
  byUser: (userId: string) => [...timesheetKeys.all, 'byUser', userId] as const,
  todayByUser: (userId: string) => [...timesheetKeys.all, 'today', userId] as const,
  hoursChart: () => [...timesheetKeys.all, 'hoursChart'] as const,
};

export const timesheetQueries = {
  allEntries: () =>
    queryOptions({
      queryKey: timesheetKeys.entries(),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('time_entries')
          .select('*, task:tasks(title), project:projects(name)')
          .order('start_time', { ascending: false });
        if (error) throw error;
        return data ?? [];
      },
    }),

  activeTimer: (userId: string) =>
    queryOptions({
      queryKey: timesheetKeys.activeTimer(userId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('time_entries')
          .select('*, task:tasks(title), project:projects(name)')
          .eq('user_id', userId)
          .eq('is_running', true)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
      enabled: !!userId,
    }),

  byTask: (taskId: string) =>
    queryOptions({
      queryKey: timesheetKeys.byTask(taskId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('time_entries')
          .select('duration_minutes')
          .eq('task_id', taskId)
          .eq('is_running', false);
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!taskId,
    }),

  byUser: (userId: string) =>
    queryOptions({
      queryKey: timesheetKeys.byUser(userId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('time_entries')
          .select('*, project:projects(name), task:tasks(title)')
          .eq('user_id', userId)
          .order('start_time', { ascending: false })
          .limit(50);
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!userId,
    }),

  todayByUser: (userId: string) =>
    queryOptions({
      queryKey: timesheetKeys.todayByUser(userId),
      queryFn: async () => {
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
        const { data, error } = await supabase
          .from('time_entries')
          .select('duration_minutes')
          .eq('user_id', userId)
          .gte('start_time', todayStart)
          .eq('is_running', false);
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!userId,
    }),

  hoursChart: () =>
    queryOptions({
      queryKey: timesheetKeys.hoursChart(),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('time_entries')
          .select('duration_minutes, start_time')
          .eq('is_running', false)
          .gte('start_time', new Date(Date.now() - 56 * 86400000).toISOString());
        if (error) throw error;
        return data ?? [];
      },
      staleTime: 5 * 60 * 1000,
    }),
};
