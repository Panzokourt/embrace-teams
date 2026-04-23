-- ───────────────────────────────────────────────────────────
-- Phase 1: pgvector + semantic infrastructure
-- ───────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;

-- ── kb_article_chunks ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kb_article_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.kb_articles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  tokens INT,
  embedding vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_article_chunks_article
  ON public.kb_article_chunks(article_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_kb_article_chunks_company
  ON public.kb_article_chunks(company_id);
CREATE INDEX IF NOT EXISTS idx_kb_article_chunks_embedding
  ON public.kb_article_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.kb_article_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view article chunks"
  ON public.kb_article_chunks FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Company members can insert article chunks"
  ON public.kb_article_chunks FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Company members can delete article chunks"
  ON public.kb_article_chunks FOR DELETE
  USING (company_id = public.get_user_company_id(auth.uid()));

-- ── embeddings on existing tables ──────────────────────────
ALTER TABLE public.kb_raw_sources
  ADD COLUMN IF NOT EXISTS embedding vector(768),
  ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_kb_raw_sources_embedding
  ON public.kb_raw_sources USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.secretary_memory
  ADD COLUMN IF NOT EXISTS embedding vector(768),
  ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_secretary_memory_embedding
  ON public.secretary_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ───────────────────────────────────────────────────────────
-- Phase 3: AI call logging
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  user_id UUID,
  function_name TEXT NOT NULL,
  task_type TEXT,
  model_used TEXT NOT NULL,
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  latency_ms INT,
  cost_estimate_usd NUMERIC(12, 8) DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_call_logs_company_created
  ON public.ai_call_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_function
  ON public.ai_call_logs(function_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_model
  ON public.ai_call_logs(model_used, created_at DESC);

ALTER TABLE public.ai_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view AI logs"
  ON public.ai_call_logs FOR SELECT
  USING (
    company_id IS NOT NULL
    AND public.is_company_admin(auth.uid(), company_id)
  );

-- Service role inserts via edge functions; no INSERT policy needed for users.

-- ───────────────────────────────────────────────────────────
-- RPCs for semantic search
-- ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.match_kb_chunks(
  query_embedding vector(768),
  _company_id UUID,
  match_count INT DEFAULT 8,
  similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  chunk_id UUID,
  article_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS chunk_id,
    c.article_id,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.kb_article_chunks c
  WHERE c.company_id = _company_id
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.match_secretary_memories(
  query_embedding vector(768),
  _user_id UUID,
  match_count INT DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.5,
  _project_id UUID DEFAULT NULL,
  _client_id UUID DEFAULT NULL
)
RETURNS TABLE (
  memory_id UUID,
  category TEXT,
  key TEXT,
  content TEXT,
  project_id UUID,
  client_id UUID,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id AS memory_id,
    m.category,
    m.key,
    m.content,
    m.project_id,
    m.client_id,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM public.secretary_memory m
  WHERE m.user_id = _user_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) >= similarity_threshold
    AND (_project_id IS NULL OR m.project_id = _project_id)
    AND (_client_id IS NULL OR m.client_id = _client_id)
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;