import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: (companyId?: string) => [...contactKeys.lists(), companyId ?? ''] as const,
  details: () => [...contactKeys.all, 'detail'] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
  byClient: (clientId: string) => [...contactKeys.all, 'byClient', clientId] as const,
  active: (companyId?: string) => [...contactKeys.all, 'active', companyId ?? ''] as const,
};

export const contactQueries = {
  list: (companyId?: string) =>
    queryOptions({
      queryKey: contactKeys.list(companyId),
      queryFn: async () => {
        let q = supabase.from('contacts').select('*').eq('is_active', true).order('name');
        if (companyId) q = q.eq('company_id', companyId);
        const { data, error } = await q;
        if (error) throw error;
        return data ?? [];
      },
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: contactKeys.detail(id),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      },
      enabled: !!id,
    }),

  byClient: (clientId: string) =>
    queryOptions({
      queryKey: contactKeys.byClient(clientId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('contacts')
          .select('id, name, email, phone, category, tags')
          .eq('client_id', clientId);
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!clientId,
    }),
};
