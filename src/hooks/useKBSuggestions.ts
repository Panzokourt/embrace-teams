import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface KBSuggestion {
  title: string;
  type: 'sop' | 'guide' | 'policy' | 'checklist' | 'article';
  reasoning: string;
  topic_brief: string;
}

const STORAGE_KEY = 'kb-suggestions-cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

interface CachedSuggestions {
  companyId: string;
  fetchedAt: number;
  suggestions: KBSuggestion[];
}

function readCache(companyId: string): KBSuggestion[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: CachedSuggestions = JSON.parse(raw);
    if (parsed.companyId !== companyId) return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL) return null;
    return parsed.suggestions;
  } catch { return null; }
}

function writeCache(companyId: string, suggestions: KBSuggestion[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ companyId, fetchedAt: Date.now(), suggestions }));
  } catch { /* ignore */ }
}

export function useKBSuggestions() {
  const { companyRole } = useAuth();
  const qc = useQueryClient();
  const companyId = companyRole?.company_id;

  const query = useQuery({
    queryKey: ['kb-suggestions', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const cached = readCache(companyId);
      if (cached) return cached;

      const { data, error } = await supabase.functions.invoke('kb-suggest-articles', {
        body: { companyId },
      });
      if (error) throw error;
      const suggestions: KBSuggestion[] = data?.suggestions || [];
      writeCache(companyId, suggestions);
      return suggestions;
    },
    enabled: !!companyId,
    staleTime: CACHE_TTL,
  });

  const refresh = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No company');
      localStorage.removeItem(STORAGE_KEY);
      const { data, error } = await supabase.functions.invoke('kb-suggest-articles', {
        body: { companyId },
      });
      if (error) throw error;
      const suggestions: KBSuggestion[] = data?.suggestions || [];
      writeCache(companyId, suggestions);
      return suggestions;
    },
    onSuccess: (s) => {
      qc.setQueryData(['kb-suggestions', companyId], s);
      toast.success(`Νέες προτάσεις: ${s.length}`);
    },
    onError: (e: Error) => toast.error(`Σφάλμα: ${e.message}`),
  });

  return { suggestions: query.data || [], isLoading: query.isLoading, refresh };
}
