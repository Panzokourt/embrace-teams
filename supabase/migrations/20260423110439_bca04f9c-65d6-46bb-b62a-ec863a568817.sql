-- ─── kb_categories: source linking ───
ALTER TABLE public.kb_categories
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS auto_synced boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_kb_categories_source
  ON public.kb_categories(company_id, source_type, source_id);

-- ─── kb_articles: reviewer workflow ───
ALTER TABLE public.kb_articles
  ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS review_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_notes text;

CREATE INDEX IF NOT EXISTS idx_kb_articles_reviewer
  ON public.kb_articles(reviewer_id, review_status)
  WHERE review_status = 'pending';

-- ─── kb_review_history ───
CREATE TABLE IF NOT EXISTS public.kb_review_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.kb_articles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  reviewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_review_history_article
  ON public.kb_review_history(article_id, created_at DESC);

ALTER TABLE public.kb_review_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kb_review_history_select"
  ON public.kb_review_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_company_roles
    WHERE user_id = auth.uid()
      AND company_id = kb_review_history.company_id
      AND status = 'active'
  ));

CREATE POLICY "kb_review_history_insert"
  ON public.kb_review_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_company_roles
    WHERE user_id = auth.uid()
      AND company_id = kb_review_history.company_id
      AND status = 'active'
  ));

-- ─── Notification trigger όταν assigned σε reviewer ───
CREATE OR REPLACE FUNCTION public.kb_article_review_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reviewer_id IS NOT NULL
     AND NEW.review_status = 'pending'
     AND (
       OLD.review_status IS DISTINCT FROM NEW.review_status
       OR OLD.reviewer_id IS DISTINCT FROM NEW.reviewer_id
     )
  THEN
    INSERT INTO public.notifications (
      company_id, user_id, type, title, message, link, metadata
    ) VALUES (
      NEW.company_id,
      NEW.reviewer_id,
      'kb_review_requested',
      'Νέο άρθρο για review',
      'Σου ζητήθηκε να κάνεις review στο: ' || NEW.title,
      '/knowledge/articles/' || NEW.id,
      jsonb_build_object('article_id', NEW.id, 'title', NEW.title)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kb_article_review_notify ON public.kb_articles;
CREATE TRIGGER trg_kb_article_review_notify
AFTER UPDATE ON public.kb_articles
FOR EACH ROW
EXECUTE FUNCTION public.kb_article_review_notify();