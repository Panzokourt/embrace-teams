import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ALL_MENTION_TYPES, type MentionType, type MentionEntity } from './mentionRegistry';

interface UseMentionSearchOptions {
  /** Restrict results to specific entity types. Defaults to all. */
  types?: MentionType[];
  /** Disable the hook entirely. */
  enabled?: boolean;
  /** Debounce ms (default 200). */
  debounceMs?: number;
  /** Per-type limit (default 5). */
  limitPerType?: number;
}

export interface MentionSearchResults {
  /** Flat ordered list (used for keyboard nav). */
  flat: MentionEntity[];
  /** Grouped by type for the popover UI. */
  grouped: { type: MentionType; items: MentionEntity[] }[];
}

const EMPTY: MentionSearchResults = { flat: [], grouped: [] };

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function useMentionSearch(
  query: string,
  opts: UseMentionSearchOptions = {}
): { results: MentionSearchResults; loading: boolean } {
  const { types = ALL_MENTION_TYPES, enabled = true, debounceMs = 200, limitPerType = 5 } = opts;
  const { companyRole } = useAuth();
  const companyId = companyRole?.company_id;

  const debouncedQuery = useDebounced(query.trim(), debounceMs);

  const { data, isFetching } = useQuery({
    queryKey: ['mention-search', companyId, debouncedQuery, types.sort().join(','), limitPerType],
    queryFn: async (): Promise<MentionSearchResults> => {
      if (!companyId || debouncedQuery.length === 0) return EMPTY;
      const term = `%${debouncedQuery}%`;
      const groupsMap = new Map<MentionType, MentionEntity[]>();

      const tasks: Promise<void>[] = [];

      const include = (t: MentionType) => types.includes(t);

      if (include('user')) tasks.push((async () => {
        const { data } = await supabase.from('profiles')
          .select('id, full_name, email, avatar_url')
          .or(`full_name.ilike.${term},email.ilike.${term}`)
          .limit(limitPerType);
        groupsMap.set('user', (data || []).map(p => ({
          id: p.id, type: 'user', label: p.full_name || p.email, sub: p.email,
        })));
      })());

      if (include('project')) tasks.push((async () => {
        const { data } = await supabase.from('projects')
          .select('id, name, status')
          .eq('company_id', companyId)
          .ilike('name', term)
          .limit(limitPerType);
        groupsMap.set('project', (data || []).map(p => ({
          id: p.id, type: 'project', label: p.name, sub: p.status || undefined,
        })));
      })());

      if (include('task')) tasks.push((async () => {
        const { data } = await supabase.from('tasks')
          .select('id, title, status')
          .ilike('title', term)
          .limit(limitPerType);
        groupsMap.set('task', (data || []).map(t => ({
          id: t.id, type: 'task', label: t.title, sub: t.status || undefined,
        })));
      })());

      if (include('client')) tasks.push((async () => {
        const { data } = await supabase.from('clients')
          .select('id, name, contact_email')
          .eq('company_id', companyId)
          .or(`name.ilike.${term},contact_email.ilike.${term}`)
          .limit(limitPerType);
        groupsMap.set('client', (data || []).map(c => ({
          id: c.id, type: 'client', label: c.name, sub: c.contact_email || undefined,
        })));
      })());

      if (include('contract')) tasks.push((async () => {
        const { data } = await supabase.from('contracts')
          .select('id, contract_number, contract_type, status')
          .eq('company_id', companyId)
          .or(`contract_number.ilike.${term},contract_type.ilike.${term}`)
          .limit(limitPerType);
        groupsMap.set('contract', (data || []).map(c => ({
          id: c.id, type: 'contract',
          label: c.contract_number || c.contract_type || 'Συμβόλαιο',
          sub: c.status || c.contract_type || undefined,
        })));
      })());

      if (include('deliverable')) tasks.push((async () => {
        const { data } = await supabase.from('deliverables')
          .select('id, name')
          .ilike('name', term)
          .limit(limitPerType);
        groupsMap.set('deliverable', (data || []).map(d => ({
          id: d.id, type: 'deliverable', label: d.name,
        })));
      })());

      if (include('invoice')) tasks.push((async () => {
        const { data } = await supabase.from('invoices')
          .select('id, invoice_number, notes')
          .or(`invoice_number.ilike.${term},notes.ilike.${term}`)
          .limit(limitPerType);
        groupsMap.set('invoice', (data || []).map((i: any) => ({
          id: i.id, type: 'invoice', label: i.invoice_number || 'Τιμολόγιο', sub: i.notes || undefined,
        })));
      })());

      if (include('campaign')) tasks.push((async () => {
        const { data } = await supabase.from('campaigns')
          .select('id, name, status')
          .eq('company_id', companyId)
          .ilike('name', term)
          .limit(limitPerType);
        groupsMap.set('campaign', (data || []).map(c => ({
          id: c.id, type: 'campaign', label: c.name, sub: c.status || undefined,
        })));
      })());

      if (include('tender')) tasks.push((async () => {
        const { data } = await supabase.from('tenders')
          .select('id, name, status' as any)
          .ilike('name', term)
          .limit(limitPerType);
        groupsMap.set('tender', (data || []).map((t: any) => ({
          id: t.id, type: 'tender', label: t.name, sub: t.status || undefined,
        })));
      })());

      if (include('file')) tasks.push((async () => {
        const { data } = await supabase.from('file_attachments')
          .select('id, file_name, content_type')
          .ilike('file_name', term)
          .limit(limitPerType);
        groupsMap.set('file', (data || []).map(f => ({
          id: f.id, type: 'file', label: f.file_name, sub: f.content_type || undefined,
        })));
      })());

      if (include('email')) tasks.push((async () => {
        const { data } = await supabase.from('email_messages')
          .select('id, thread_id, subject, from_name, from_address')
          .ilike('subject', term)
          .order('sent_at', { ascending: false })
          .limit(limitPerType * 2);
        const seen = new Set<string>();
        const items: MentionEntity[] = [];
        for (const e of (data || []) as any[]) {
          const tid = e.thread_id || e.id;
          if (seen.has(tid)) continue;
          seen.add(tid);
          items.push({ id: tid, type: 'email', label: e.subject || '(χωρίς θέμα)', sub: e.from_name || e.from_address || undefined });
          if (items.length >= limitPerType) break;
        }
        groupsMap.set('email', items);
      })());

      if (include('wiki')) tasks.push((async () => {
        const { data } = await supabase.from('kb_articles' as any)
          .select('id, title, status')
          .ilike('title', term)
          .limit(limitPerType);
        groupsMap.set('wiki', ((data as any[]) || []).map((w: any) => ({
          id: w.id, type: 'wiki', label: w.title, sub: w.status || undefined,
        })));
      })());

      await Promise.allSettled(tasks);

      // Build grouped + flat respecting registry order
      const grouped = ALL_MENTION_TYPES
        .filter(t => types.includes(t))
        .map(t => ({ type: t, items: groupsMap.get(t) || [] }))
        .filter(g => g.items.length > 0);
      const flat = grouped.flatMap(g => g.items);
      return { grouped, flat };
    },
    enabled: enabled && !!companyId && debouncedQuery.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  return {
    results: data ?? EMPTY,
    loading: isFetching && debouncedQuery.length > 0,
  };
}
