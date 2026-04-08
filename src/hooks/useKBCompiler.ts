import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState, useCallback } from 'react';

export interface KBRawSource {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  content: string;
  source_type: string;
  url: string | null;
  compiled: boolean;
  compiled_at: string | null;
  created_at: string;
}

export interface KBArticleLink {
  id: string;
  from_article_id: string;
  to_article_id: string;
  company_id: string;
}

export interface HealthReport {
  contradictions: { page1: string; page2: string; description: string }[];
  orphan_pages: string[];
  missing_concepts: { title: string; reason: string }[];
  improvements: { page: string; suggestion: string }[];
  overall_score: number;
}

export function useKBCompiler() {
  const { profile, companyRole } = useAuth();
  const queryClient = useQueryClient();
  const companyId = companyRole?.company_id;

  // ─── Raw Sources ───
  const sourcesQuery = useQuery({
    queryKey: ['kb-raw-sources', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_raw_sources')
        .select('*')
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as KBRawSource[];
    },
    enabled: !!companyId,
  });

  const createSource = useMutation({
    mutationFn: async (source: { title: string; content: string; source_type: string; url?: string }) => {
      const { data, error } = await supabase
        .from('kb_raw_sources')
        .insert({
          ...source,
          company_id: companyId!,
          user_id: profile?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-raw-sources'] });
      toast.success('Πηγή προστέθηκε');
    },
    onError: () => toast.error('Σφάλμα προσθήκης πηγής'),
  });

  const deleteSource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kb_raw_sources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-raw-sources'] });
      toast.success('Πηγή διαγράφηκε');
    },
  });

  // ─── Article Links ───
  const useArticleBacklinks = (articleId: string) =>
    useQuery({
      queryKey: ['kb-article-backlinks', articleId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('kb_article_links')
          .select('from_article_id')
          .eq('to_article_id', articleId);
        if (error) throw error;
        // Fetch article titles for the backlinks
        const fromIds = data.map((l: any) => l.from_article_id);
        if (fromIds.length === 0) return [];
        const { data: articles } = await supabase
          .from('kb_articles')
          .select('id, title')
          .in('id', fromIds);
        return articles || [];
      },
      enabled: !!articleId,
    });

  // ─── Compile ───
  const compileSource = useMutation({
    mutationFn: async (sourceId: string) => {
      const { data, error } = await supabase.functions.invoke('kb-compiler', {
        body: { action: 'compile', sourceId, companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kb-raw-sources'] });
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      toast.success(`Compiled! ${data.pages_processed} σελίδες δημιουργήθηκαν/ενημερώθηκαν`);
    },
    onError: (e: Error) => toast.error(`Σφάλμα compilation: ${e.message}`),
  });

  // ─── Ask Wiki (streaming) ───
  const [askAnswer, setAskAnswer] = useState('');
  const [askLoading, setAskLoading] = useState(false);

  const askWiki = useCallback(async (question: string) => {
    setAskAnswer('');
    setAskLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kb-compiler`;

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: 'ask', question, companyId }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Stream failed');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setAskAnswer(accumulated);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Σφάλμα ερώτησης');
    } finally {
      setAskLoading(false);
    }
  }, [companyId]);

  // ─── Health Check ───
  const healthCheck = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('kb-compiler', {
        body: { action: 'health', companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as HealthReport;
    },
    onError: (e: Error) => toast.error(`Σφάλμα health check: ${e.message}`),
  });

  return {
    sources: sourcesQuery.data || [],
    sourcesLoading: sourcesQuery.isLoading,
    createSource,
    deleteSource,
    compileSource,
    askWiki,
    askAnswer,
    askLoading,
    healthCheck,
    useArticleBacklinks,
  };
}
