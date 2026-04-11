import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (companyId: string) => [...clientKeys.lists(), companyId] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientKeys.details(), id] as const,
  nameList: () => [...clientKeys.all, 'nameList'] as const,
};

export const clientQueries = {
  list: (companyId: string) =>
    queryOptions({
      queryKey: clientKeys.list(companyId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('company_id', companyId)
          .order('name');
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!companyId,
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: clientKeys.detail(id),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      },
      enabled: !!id,
    }),

  nameList: () =>
    queryOptions({
      queryKey: clientKeys.nameList(),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('clients')
          .select('id, name, sector')
          .order('name');
        if (error) throw error;
        return data ?? [];
      },
    }),
};
