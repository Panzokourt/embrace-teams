import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { projectKeys } from './projects';
import { clientKeys } from './clients';
import { invoiceKeys } from './invoices';
import { expenseKeys } from './expenses';
import { taskKeys } from './tasks';
import { contactKeys } from './contacts';
import { timesheetKeys } from './timesheets';
import { mediaPlanKeys } from './media-plans';
import { contractKeys } from './contracts';

// ─── Generic mutation factory ─────────────────────────────────────────
type MutationConfig<TInput, TReturn = void> = {
  mutationFn: (input: TInput) => Promise<TReturn>;
  invalidateKeys: readonly (readonly string[])[];
  successMessage?: string;
  errorMessage?: string;
};

function createMutation<TInput, TReturn = void>(config: MutationConfig<TInput, TReturn>) {
  return () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: config.mutationFn,
      onSuccess: () => {
        config.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key as string[] });
        });
        if (config.successMessage) toast.success(config.successMessage);
      },
      onError: (error: Error) => {
        console.error(error);
        toast.error(config.errorMessage ?? 'Σφάλμα αποθήκευσης');
      },
    });
  };
}

// ─── Project Mutations ────────────────────────────────────────────────
export const useCreateProject = createMutation<{
  name: string;
  company_id: string;
  client_id?: string;
  [key: string]: any;
}>({
  mutationFn: async (input) => {
    const { error } = await supabase.from('projects').insert(input);
    if (error) throw error;
  },
  invalidateKeys: [projectKeys.all],
  successMessage: 'Το έργο δημιουργήθηκε',
});

export const useUpdateProject = createMutation<{
  id: string;
  updates: Record<string, any>;
}>({
  mutationFn: async ({ id, updates }) => {
    const { error } = await supabase.from('projects').update(updates).eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [projectKeys.all],
  successMessage: 'Το έργο ενημερώθηκε',
});

export const useDeleteProject = createMutation<string>({
  mutationFn: async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [projectKeys.all],
  successMessage: 'Το έργο διαγράφηκε',
});

// ─── Client Mutations ─────────────────────────────────────────────────
export const useCreateClient = createMutation<{
  name: string;
  company_id: string;
  [key: string]: any;
}>({
  mutationFn: async (input) => {
    const { error } = await supabase.from('clients').insert(input);
    if (error) throw error;
  },
  invalidateKeys: [clientKeys.all],
  successMessage: 'Ο πελάτης δημιουργήθηκε',
});

export const useUpdateClient = createMutation<{
  id: string;
  updates: Record<string, any>;
}>({
  mutationFn: async ({ id, updates }) => {
    const { error } = await supabase.from('clients').update(updates).eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [clientKeys.all],
  successMessage: 'Ο πελάτης ενημερώθηκε',
});

export const useDeleteClient = createMutation<string>({
  mutationFn: async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [clientKeys.all],
  successMessage: 'Ο πελάτης διαγράφηκε',
});

// ─── Task Mutations ───────────────────────────────────────────────────
export const useCreateTask = createMutation<{
  title: string;
  project_id: string;
  [key: string]: any;
}>({
  mutationFn: async (input) => {
    const { error } = await supabase.from('tasks').insert(input);
    if (error) throw error;
  },
  invalidateKeys: [taskKeys.all],
  successMessage: 'Το task δημιουργήθηκε',
});

export const useUpdateTask = createMutation<{
  id: string;
  updates: Record<string, any>;
}>({
  mutationFn: async ({ id, updates }) => {
    const { error } = await supabase.from('tasks').update(updates).eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [taskKeys.all, timesheetKeys.all],
});

export const useDeleteTask = createMutation<string>({
  mutationFn: async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [taskKeys.all],
  successMessage: 'Το task διαγράφηκε',
});

// ─── Invoice Mutations ────────────────────────────────────────────────
export const useCreateInvoice = createMutation<{
  project_id: string;
  [key: string]: any;
}>({
  mutationFn: async (input) => {
    const { error } = await supabase.from('invoices').insert(input);
    if (error) throw error;
  },
  invalidateKeys: [invoiceKeys.all],
  successMessage: 'Το τιμολόγιο δημιουργήθηκε',
});

export const useUpdateInvoice = createMutation<{
  id: string;
  updates: Record<string, any>;
}>({
  mutationFn: async ({ id, updates }) => {
    const { error } = await supabase.from('invoices').update(updates).eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [invoiceKeys.all],
  successMessage: 'Το τιμολόγιο ενημερώθηκε',
});

export const useDeleteInvoice = createMutation<string>({
  mutationFn: async (id) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [invoiceKeys.all],
  successMessage: 'Το τιμολόγιο διαγράφηκε',
});

// ─── Expense Mutations ────────────────────────────────────────────────
export const useCreateExpense = createMutation<{
  description: string;
  amount: number;
  [key: string]: any;
}>({
  mutationFn: async (input) => {
    const { error } = await supabase.from('expenses').insert(input);
    if (error) throw error;
  },
  invalidateKeys: [expenseKeys.all],
  successMessage: 'Το έξοδο καταχωρήθηκε',
});

export const useUpdateExpense = createMutation<{
  id: string;
  updates: Record<string, any>;
}>({
  mutationFn: async ({ id, updates }) => {
    const { error } = await supabase.from('expenses').update(updates).eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [expenseKeys.all],
  successMessage: 'Το έξοδο ενημερώθηκε',
});

export const useDeleteExpense = createMutation<string>({
  mutationFn: async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [expenseKeys.all],
  successMessage: 'Το έξοδο διαγράφηκε',
});

// ─── Contact Mutations ────────────────────────────────────────────────
export const useCreateContact = createMutation<{
  name: string;
  company_id: string;
  [key: string]: any;
}>({
  mutationFn: async (input) => {
    const { error } = await supabase.from('contacts').insert(input);
    if (error) throw error;
  },
  invalidateKeys: [contactKeys.all],
  successMessage: 'Η επαφή δημιουργήθηκε',
});

export const useUpdateContact = createMutation<{
  id: string;
  updates: Record<string, any>;
}>({
  mutationFn: async ({ id, updates }) => {
    const { error } = await supabase.from('contacts').update(updates).eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [contactKeys.all],
  successMessage: 'Η επαφή ενημερώθηκε',
});

export const useDeleteContact = createMutation<string>({
  mutationFn: async (id) => {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [contactKeys.all],
  successMessage: 'Η επαφή διαγράφηκε',
});

// ─── Time Entry Mutations ─────────────────────────────────────────────
export const useCreateTimeEntry = createMutation<{
  user_id: string;
  project_id: string;
  [key: string]: any;
}>({
  mutationFn: async (input) => {
    const { error } = await supabase.from('time_entries').insert(input);
    if (error) throw error;
  },
  invalidateKeys: [timesheetKeys.all],
  successMessage: 'Καταχώρηση χρόνου αποθηκεύτηκε',
});

export const useUpdateTimeEntry = createMutation<{
  id: string;
  updates: Record<string, any>;
}>({
  mutationFn: async ({ id, updates }) => {
    const { error } = await supabase.from('time_entries').update(updates).eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [timesheetKeys.all, taskKeys.all],
});

export const useDeleteTimeEntry = createMutation<string>({
  mutationFn: async (id) => {
    const { error } = await supabase.from('time_entries').delete().eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [timesheetKeys.all],
  successMessage: 'Καταχώρηση διαγράφηκε',
});

// ─── Contract Mutations ───────────────────────────────────────────────
export const useCreateContract = createMutation<{
  project_id: string;
  company_id: string;
  [key: string]: any;
}>({
  mutationFn: async (input) => {
    const { error } = await supabase.from('contracts').insert(input);
    if (error) throw error;
  },
  invalidateKeys: [contractKeys.all],
  successMessage: 'Η σύμβαση δημιουργήθηκε',
});

export const useUpdateContract = createMutation<{
  id: string;
  updates: Record<string, any>;
}>({
  mutationFn: async ({ id, updates }) => {
    const { error } = await supabase.from('contracts').update(updates).eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [contractKeys.all],
  successMessage: 'Η σύμβαση ενημερώθηκε',
});

// ─── Media Plan Mutations ─────────────────────────────────────────────
export const useCreateMediaPlan = createMutation<{
  name: string;
  [key: string]: any;
}>({
  mutationFn: async (input) => {
    const { error } = await supabase.from('media_plans').insert(input);
    if (error) throw error;
  },
  invalidateKeys: [mediaPlanKeys.all],
  successMessage: 'Το media plan δημιουργήθηκε',
});

export const useUpdateMediaPlan = createMutation<{
  id: string;
  updates: Record<string, any>;
}>({
  mutationFn: async ({ id, updates }) => {
    const { error } = await supabase.from('media_plans').update(updates).eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [mediaPlanKeys.all],
});

export const useDeleteMediaPlan = createMutation<string>({
  mutationFn: async (id) => {
    const { error } = await supabase.from('media_plans').delete().eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [mediaPlanKeys.all],
  successMessage: 'Το media plan διαγράφηκε',
});
