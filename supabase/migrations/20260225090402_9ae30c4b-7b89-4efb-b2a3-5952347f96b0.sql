
-- ================================================
-- Knowledge Base Module: 5 tables + RLS
-- ================================================

-- 1) kb_categories
CREATE TABLE public.kb_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  parent_id uuid REFERENCES public.kb_categories(id) ON DELETE SET NULL,
  level integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kb_categories_select" ON public.kb_categories FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_company_roles WHERE user_id = auth.uid() AND company_id = kb_categories.company_id AND status = 'active')
);
CREATE POLICY "kb_categories_insert" ON public.kb_categories FOR INSERT WITH CHECK (
  public.is_company_admin_or_manager(auth.uid(), company_id)
);
CREATE POLICY "kb_categories_update" ON public.kb_categories FOR UPDATE USING (
  public.is_company_admin_or_manager(auth.uid(), company_id)
);
CREATE POLICY "kb_categories_delete" ON public.kb_categories FOR DELETE USING (
  public.is_company_admin_or_manager(auth.uid(), company_id)
);

-- 2) kb_articles
CREATE TABLE public.kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  article_type text NOT NULL DEFAULT 'article',
  category_id uuid REFERENCES public.kb_categories(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  visibility text NOT NULL DEFAULT 'internal',
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  gov_asset_id uuid REFERENCES public.gov_assets(id) ON DELETE SET NULL,
  source_links text[] DEFAULT '{}',
  version integer NOT NULL DEFAULT 1,
  next_review_date date,
  attendees text[] DEFAULT '{}',
  decisions jsonb DEFAULT '[]',
  action_items jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kb_articles_select" ON public.kb_articles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_company_roles WHERE user_id = auth.uid() AND company_id = kb_articles.company_id AND status = 'active')
);
CREATE POLICY "kb_articles_insert" ON public.kb_articles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_company_roles WHERE user_id = auth.uid() AND company_id = kb_articles.company_id AND status = 'active')
);
CREATE POLICY "kb_articles_update" ON public.kb_articles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_company_roles WHERE user_id = auth.uid() AND company_id = kb_articles.company_id AND status = 'active')
);
CREATE POLICY "kb_articles_delete" ON public.kb_articles FOR DELETE USING (
  public.is_company_admin_or_manager(auth.uid(), company_id)
);

CREATE TRIGGER kb_articles_updated_at BEFORE UPDATE ON public.kb_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) kb_templates
CREATE TABLE public.kb_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  template_type text NOT NULL DEFAULT 'sop',
  description text DEFAULT '',
  content jsonb DEFAULT '{}',
  default_tasks jsonb DEFAULT '[]',
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kb_templates_select" ON public.kb_templates FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_company_roles WHERE user_id = auth.uid() AND company_id = kb_templates.company_id AND status = 'active')
);
CREATE POLICY "kb_templates_insert" ON public.kb_templates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_company_roles WHERE user_id = auth.uid() AND company_id = kb_templates.company_id AND status = 'active')
);
CREATE POLICY "kb_templates_update" ON public.kb_templates FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_company_roles WHERE user_id = auth.uid() AND company_id = kb_templates.company_id AND status = 'active')
);
CREATE POLICY "kb_templates_delete" ON public.kb_templates FOR DELETE USING (
  public.is_company_admin_or_manager(auth.uid(), company_id)
);

CREATE TRIGGER kb_templates_updated_at BEFORE UPDATE ON public.kb_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) kb_article_versions (immutable)
CREATE TABLE public.kb_article_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.kb_articles(id) ON DELETE CASCADE,
  version integer NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  change_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_article_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kb_article_versions_select" ON public.kb_article_versions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.kb_articles a
    JOIN public.user_company_roles ucr ON ucr.company_id = a.company_id
    WHERE a.id = kb_article_versions.article_id AND ucr.user_id = auth.uid() AND ucr.status = 'active'
  )
);
CREATE POLICY "kb_article_versions_insert" ON public.kb_article_versions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.kb_articles a
    JOIN public.user_company_roles ucr ON ucr.company_id = a.company_id
    WHERE a.id = kb_article_versions.article_id AND ucr.user_id = auth.uid() AND ucr.status = 'active'
  )
);

-- 5) kb_template_usage
CREATE TABLE public.kb_template_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.kb_templates(id) ON DELETE CASCADE,
  used_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_template_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kb_template_usage_select" ON public.kb_template_usage FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_company_roles WHERE user_id = auth.uid() AND company_id = kb_template_usage.company_id AND status = 'active')
);
CREATE POLICY "kb_template_usage_insert" ON public.kb_template_usage FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_company_roles WHERE user_id = auth.uid() AND company_id = kb_template_usage.company_id AND status = 'active')
);
