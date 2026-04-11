import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const expenseKeys = {
  all: ['expenses'] as const,
  byProject: (projectId: string) => [...expenseKeys.all, 'byProject', projectId] as const,
  list: () => [...expenseKeys.all, 'list'] as const,
};

export const expenseQueries = {
  byProject: (projectId: string) =>
    queryOptions({
      queryKey: expenseKeys.byProject(projectId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .eq('project_id', projectId)
          .order('expense_date', { ascending: false });
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!projectId,
    }),

  list: () =>
    queryOptions({
      queryKey: expenseKeys.list(),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('expenses')
          .select('*, project:projects(name)')
          .order('expense_date', { ascending: false });
        if (error) throw error;
        return data ?? [];
      },
    }),
};
