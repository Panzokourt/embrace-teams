
-- kb_raw_sources: stores raw uploaded content for AI compilation
CREATE TABLE public.kb_raw_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'note',
  url TEXT,
  compiled BOOLEAN NOT NULL DEFAULT false,
  compiled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_raw_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view sources"
  ON public.kb_raw_sources FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Company members can insert sources"
  ON public.kb_raw_sources FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Company members can update sources"
  ON public.kb_raw_sources FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Company members can delete sources"
  ON public.kb_raw_sources FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid() AND status = 'active'));

-- kb_article_links: tracks cross-references between articles
CREATE TABLE public.kb_article_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_article_id UUID NOT NULL REFERENCES public.kb_articles(id) ON DELETE CASCADE,
  to_article_id UUID NOT NULL REFERENCES public.kb_articles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_article_id, to_article_id)
);

ALTER TABLE public.kb_article_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view links"
  ON public.kb_article_links FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Company members can insert links"
  ON public.kb_article_links FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Company members can delete links"
  ON public.kb_article_links FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid() AND status = 'active'));
