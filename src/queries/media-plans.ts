import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const mediaPlanKeys = {
  all: ['media-plans'] as const,
  lists: () => [...mediaPlanKeys.all, 'list'] as const,
  list: (companyId?: string) => [...mediaPlanKeys.lists(), companyId ?? ''] as const,
  detail: (id: string) => [...mediaPlanKeys.all, 'detail', id] as const,
  items: (planId: string) => [...mediaPlanKeys.all, 'items', planId] as const,
  byProject: (projectId: string) => [...mediaPlanKeys.all, 'byProject', projectId] as const,
};

export const mediaPlanQueries = {
  list: (companyId?: string) =>
    queryOptions({
      queryKey: mediaPlanKeys.list(companyId),
      queryFn: async () => {
        let q = supabase
          .from('media_plans')
          .select('*, project:projects(id, name, client:clients(id, name))')
          .order('created_at', { ascending: false });
        if (companyId) q = q.eq('company_id', companyId);
        const { data, error } = await q;
        if (error) throw error;
        return data ?? [];
      },
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: mediaPlanKeys.detail(id),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('media_plans')
          .select('*, project:projects(id, name, client:clients(id, name))')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      },
      enabled: !!id,
    }),

  items: (planId: string) =>
    queryOptions({
      queryKey: mediaPlanKeys.items(planId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('media_plan_items')
          .select('*')
          .eq('media_plan_id', planId)
          .order('sort_order');
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!planId,
    }),

  byProject: (projectId: string) =>
    queryOptions({
      queryKey: mediaPlanKeys.byProject(projectId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('media_plans')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!projectId,
    }),
};
