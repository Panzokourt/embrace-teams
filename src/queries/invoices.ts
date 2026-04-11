import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const invoiceKeys = {
  all: ['invoices'] as const,
  byProject: (projectId: string) => [...invoiceKeys.all, 'byProject', projectId] as const,
  byClient: (clientId: string) => [...invoiceKeys.all, 'byClient', clientId] as const,
  list: () => [...invoiceKeys.all, 'list'] as const,
};

export const invoiceQueries = {
  byProject: (projectId: string) =>
    queryOptions({
      queryKey: invoiceKeys.byProject(projectId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('project_id', projectId)
          .order('issued_date', { ascending: false });
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!projectId,
    }),

  byClient: (clientId: string) =>
    queryOptions({
      queryKey: invoiceKeys.byClient(clientId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('invoices')
          .select('id, amount, paid, issued_date')
          .eq('client_id', clientId)
          .order('issued_date', { ascending: false });
        if (error) throw error;
        return data ?? [];
      },
      enabled: !!clientId,
    }),

  list: () =>
    queryOptions({
      queryKey: invoiceKeys.list(),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('invoices')
          .select('*, project:projects(name), client:clients(name)')
          .order('issued_date', { ascending: false });
        if (error) throw error;
        return data ?? [];
      },
    }),
};
