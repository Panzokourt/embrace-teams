import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const contractKeys = {
  all: ['contracts'] as const,
  byProject: (projectId: string) => [...contractKeys.all, 'byProject', projectId] as const,
  detail: (id: string) => [...contractKeys.all, 'detail', id] as const,
  withDates: () => [...contractKeys.all, 'withDates'] as const,
};

export const contractQueries = {
  byProject: (projectId: string) =>
    queryOptions({
      queryKey: contractKeys.byProject(projectId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!projectId,
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: contractKeys.detail(id),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      },
      enabled: !!id,
    }),

  withDates: () =>
    queryOptions({
      queryKey: contractKeys.withDates(),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('contracts')
          .select('id, start_date, end_date, project:projects(name)');
        if (error) throw error;
        return data ?? [];
      },
    }),
};
