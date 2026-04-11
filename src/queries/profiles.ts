import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const profileKeys = {
  all: ['profiles'] as const,
  detail: (id: string) => [...profileKeys.all, 'detail', id] as const,
  companyList: (companyId: string) => [...profileKeys.all, 'companyList', companyId] as const,
  nameList: () => [...profileKeys.all, 'nameList'] as const,
};

export const profileQueries = {
  detail: (id: string) =>
    queryOptions({
      queryKey: profileKeys.detail(id),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('profiles')
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
      queryKey: profileKeys.nameList(),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .order('full_name');
        if (error) throw error;
        return data ?? [];
      },
    }),
};
