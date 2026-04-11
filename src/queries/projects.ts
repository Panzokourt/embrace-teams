import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (companyId: string) => [...projectKeys.lists(), companyId] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  sidebar: (companyId: string) => [...projectKeys.all, 'sidebar', companyId] as const,
  subprojects: (parentId: string) => [...projectKeys.all, 'subprojects', parentId] as const,
  byClient: (clientId: string) => [...projectKeys.all, 'byClient', clientId] as const,
  active: () => [...projectKeys.all, 'active'] as const,
  nameList: (companyId?: string) => [...projectKeys.all, 'nameList', companyId ?? ''] as const,
};

export const projectQueries = {
  list: (companyId: string) =>
    queryOptions({
      queryKey: projectKeys.list(companyId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('projects')
          .select('*, client:clients(name, sector)')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
      },
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: projectKeys.detail(id),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('projects')
          .select('*, client:clients(id, name, sector, contact_email, contact_phone)')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      },
      enabled: !!id,
    }),

  byClient: (clientId: string) =>
    queryOptions({
      queryKey: projectKeys.byClient(clientId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, status, progress, budget, start_date, end_date')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!clientId,
    }),

  subprojects: (parentId: string) =>
    queryOptions({
      queryKey: projectKeys.subprojects(parentId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, status, progress')
          .eq('parent_project_id', parentId)
          .order('name');
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!parentId,
    }),

  active: () =>
    queryOptions({
      queryKey: projectKeys.active(),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, progress')
          .eq('status', 'active')
          .order('name')
          .limit(8);
        if (error) throw error;
        return data ?? [];
      },
    }),

  nameList: (companyId?: string) =>
    queryOptions({
      queryKey: projectKeys.nameList(companyId),
      queryFn: async () => {
        let q = supabase.from('projects').select('id, name').order('name');
        if (companyId) q = q.eq('company_id', companyId);
        const { data, error } = await q;
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!companyId,
    }),
};
