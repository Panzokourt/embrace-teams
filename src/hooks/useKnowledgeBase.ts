import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Types ───
export interface KBCategory {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  level: number;
  sort_order: number;
  created_at: string;
}

export interface KBArticle {
  id: string;
  company_id: string;
  title: string;
  body: string;
  article_type: string;
  category_id: string | null;
  tags: string[];
  owner_id: string | null;
  status: string;
  visibility: string;
  client_id: string | null;
  project_id: string | null;
  gov_asset_id: string | null;
  source_links: string[];
  version: number;
  next_review_date: string | null;
  attendees: string[];
  decisions: any;
  action_items: any;
  reviewer_id: string | null;
  review_status: 'none' | 'pending' | 'approved' | 'changes_requested' | string;
  review_requested_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface KBTemplate {
  id: string;
  company_id: string;
  title: string;
  template_type: string;
  description: string;
  content: any;
  default_tasks: any;
  owner_id: string | null;
  status: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface KBArticleVersion {
  id: string;
  article_id: string;
  version: number;
  title: string;
  body: string;
  changed_by: string | null;
  change_notes: string;
  created_at: string;
}

export function useKnowledgeBase() {
  const { profile, companyRole } = useAuth();
  const queryClient = useQueryClient();
  const companyId = companyRole?.company_id;

  // ─── Categories ───
  const categoriesQuery = useQuery({
    queryKey: ['kb-categories', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_categories')
        .select('*')
        .eq('company_id', companyId!)
        .order('level')
        .order('sort_order');
      if (error) throw error;
      return data as KBCategory[];
    },
    enabled: !!companyId,
  });

  const createCategory = useMutation({
    mutationFn: async (cat: Partial<KBCategory>) => {
      const { data, error } = await supabase
        .from('kb_categories')
        .insert({ ...cat, company_id: companyId! } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
      toast.success('Κατηγορία δημιουργήθηκε');
    },
    onError: () => toast.error('Σφάλμα δημιουργίας κατηγορίας'),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kb_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
      toast.success('Κατηγορία διαγράφηκε');
    },
  });

  // ─── Articles ───
  const articlesQuery = useQuery({
    queryKey: ['kb-articles', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_articles')
        .select('*')
        .eq('company_id', companyId!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as KBArticle[];
    },
    enabled: !!companyId,
  });

  const createArticle = useMutation({
    mutationFn: async (article: Partial<KBArticle>) => {
      const { data, error } = await supabase
        .from('kb_articles')
        .insert({
          ...article,
          company_id: companyId!,
          owner_id: article.owner_id || profile?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      toast.success('Άρθρο δημιουργήθηκε');
    },
    onError: () => toast.error('Σφάλμα δημιουργίας άρθρου'),
  });

  const updateArticle = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KBArticle> & { id: string }) => {
      // Get current article for version snapshot
      const { data: current } = await supabase
        .from('kb_articles')
        .select('title, body, version')
        .eq('id', id)
        .single();

      if (current) {
        // Save version snapshot
        await supabase.from('kb_article_versions').insert({
          article_id: id,
          version: current.version,
          title: current.title,
          body: current.body,
          changed_by: profile?.id,
          change_notes: '',
        } as any);
      }

      const newVersion = (current?.version || 0) + 1;
      const { data, error } = await supabase
        .from('kb_articles')
        .update({ ...updates, version: newVersion } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      toast.success('Άρθρο ενημερώθηκε');
    },
    onError: () => toast.error('Σφάλμα ενημέρωσης'),
  });

  const deleteArticle = useMutation({
    mutationFn: async (id: string) => {
      // Deprecate instead of delete
      const { error } = await supabase
        .from('kb_articles')
        .update({ status: 'deprecated' } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      toast.success('Άρθρο αρχειοθετήθηκε');
    },
  });

  // ─── Templates ───
  const templatesQuery = useQuery({
    queryKey: ['kb-templates', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_templates')
        .select('*')
        .eq('company_id', companyId!)
        .order('usage_count', { ascending: false });
      if (error) throw error;
      return data as KBTemplate[];
    },
    enabled: !!companyId,
  });

  const createTemplate = useMutation({
    mutationFn: async (tpl: Partial<KBTemplate>) => {
      const { data, error } = await supabase
        .from('kb_templates')
        .insert({
          ...tpl,
          company_id: companyId!,
          owner_id: tpl.owner_id || profile?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-templates'] });
      toast.success('Template δημιουργήθηκε');
    },
    onError: () => toast.error('Σφάλμα δημιουργίας template'),
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KBTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('kb_templates')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-templates'] });
      toast.success('Template ενημερώθηκε');
    },
  });

  const useTemplate = useMutation({
    mutationFn: async ({ templateId, projectId, clientId }: { templateId: string; projectId?: string; clientId?: string }) => {
      // Log usage
      await supabase.from('kb_template_usage').insert({
        company_id: companyId!,
        template_id: templateId,
        used_by: profile?.id,
        project_id: projectId || null,
        client_id: clientId || null,
      } as any);
      // Increment usage count
      const { data: tpl } = await supabase.from('kb_templates').select('usage_count').eq('id', templateId).single();
      await supabase.from('kb_templates').update({ usage_count: (tpl?.usage_count || 0) + 1 } as any).eq('id', templateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-templates'] });
      toast.success('Template χρησιμοποιήθηκε');
    },
  });

  // ─── Article Versions ───
  const useArticleVersions = (articleId: string) =>
    useQuery({
      queryKey: ['kb-article-versions', articleId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('kb_article_versions')
          .select('*')
          .eq('article_id', articleId)
          .order('version', { ascending: false });
        if (error) throw error;
        return data as KBArticleVersion[];
      },
      enabled: !!articleId,
    });

  // ─── Seed default categories ───
  const seedCategories = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No company');
      const { data: existing } = await supabase
        .from('kb_categories')
        .select('id')
        .eq('company_id', companyId)
        .limit(1);
      if (existing && existing.length > 0) return; // already seeded

      const level1 = [
        { name: 'Company', slug: 'company' },
        { name: 'Departments', slug: 'departments' },
        { name: 'Clients', slug: 'clients' },
        { name: 'Templates', slug: 'templates' },
      ];

      const inserted: Record<string, string> = {};
      for (const cat of level1) {
        const { data } = await supabase
          .from('kb_categories')
          .insert({ company_id: companyId, name: cat.name, slug: cat.slug, level: 1, sort_order: level1.indexOf(cat) } as any)
          .select()
          .single();
        if (data) inserted[cat.slug] = data.id;
      }

      const level2: { parent: string; items: { name: string; slug: string }[] }[] = [
        { parent: 'company', items: [
          { name: 'Operations', slug: 'operations' },
          { name: 'Quality', slug: 'quality' },
          { name: 'Security', slug: 'security' },
          { name: 'Tools & Platforms', slug: 'tools' },
        ]},
        { parent: 'departments', items: [
          { name: 'Performance', slug: 'performance' },
          { name: 'Creative', slug: 'creative' },
          { name: 'Social Media', slug: 'social-media' },
          { name: 'Account Management', slug: 'account-mgmt' },
          { name: 'Tech/Dev', slug: 'tech-dev' },
        ]},
        { parent: 'templates', items: [
          { name: 'Briefs', slug: 'briefs' },
          { name: 'Reports', slug: 'reports' },
          { name: 'Checklists', slug: 'checklists' },
          { name: 'SOPs', slug: 'sops' },
        ]},
      ];

      for (const group of level2) {
        const parentId = inserted[group.parent];
        if (!parentId) continue;
        for (let i = 0; i < group.items.length; i++) {
          await supabase.from('kb_categories').insert({
            company_id: companyId,
            name: group.items[i].name,
            slug: group.items[i].slug,
            parent_id: parentId,
            level: 2,
            sort_order: i,
          } as any);
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kb-categories'] }),
  });

  return {
    categories: categoriesQuery.data || [],
    categoriesLoading: categoriesQuery.isLoading,
    createCategory,
    deleteCategory,
    articles: articlesQuery.data || [],
    articlesLoading: articlesQuery.isLoading,
    createArticle,
    updateArticle,
    deleteArticle,
    templates: templatesQuery.data || [],
    templatesLoading: templatesQuery.isLoading,
    createTemplate,
    updateTemplate,
    useTemplate,
    useArticleVersions,
    seedCategories,
  };
}
