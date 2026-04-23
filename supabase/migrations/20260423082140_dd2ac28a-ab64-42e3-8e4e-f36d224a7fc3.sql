-- ============================================================
-- Phase 5 · GraphRAG · Knowledge Graph Layer
-- ============================================================

-- 1. CORE TABLES
CREATE TABLE IF NOT EXISTS public.graph_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  node_type text NOT NULL,
  entity_id uuid NOT NULL,
  label text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(768),
  embedded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, node_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_company_type ON public.graph_nodes(company_id, node_type);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_entity ON public.graph_nodes(entity_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_props ON public.graph_nodes USING gin(properties);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_embedding ON public.graph_nodes
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS public.graph_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  source_node_id uuid NOT NULL REFERENCES public.graph_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES public.graph_nodes(id) ON DELETE CASCADE,
  relation_type text NOT NULL,
  weight numeric(4,3) NOT NULL DEFAULT 1.000,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_node_id, target_node_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON public.graph_edges(source_node_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON public.graph_edges(target_node_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_graph_edges_company ON public.graph_edges(company_id);

-- 2. RLS
ALTER TABLE public.graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graph_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "graph_nodes_company_isolation_select" ON public.graph_nodes;
DROP POLICY IF EXISTS "graph_nodes_company_isolation_modify" ON public.graph_nodes;
DROP POLICY IF EXISTS "graph_edges_company_isolation_select" ON public.graph_edges;
DROP POLICY IF EXISTS "graph_edges_company_isolation_modify" ON public.graph_edges;

CREATE POLICY "graph_nodes_company_isolation_select" ON public.graph_nodes
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "graph_nodes_company_isolation_modify" ON public.graph_nodes
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "graph_edges_company_isolation_select" ON public.graph_edges
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "graph_edges_company_isolation_modify" ON public.graph_edges
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- 3. UPSERT NODE
CREATE OR REPLACE FUNCTION public.upsert_graph_node(
  _company_id uuid,
  _node_type text,
  _entity_id uuid,
  _label text,
  _properties jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _node_id uuid;
BEGIN
  INSERT INTO public.graph_nodes (company_id, node_type, entity_id, label, properties, updated_at)
  VALUES (_company_id, _node_type, _entity_id, COALESCE(_label, ''), COALESCE(_properties, '{}'::jsonb), now())
  ON CONFLICT (company_id, node_type, entity_id)
  DO UPDATE SET
    label = EXCLUDED.label,
    properties = EXCLUDED.properties,
    updated_at = now(),
    embedding = CASE WHEN public.graph_nodes.label IS DISTINCT FROM EXCLUDED.label
                       OR public.graph_nodes.properties IS DISTINCT FROM EXCLUDED.properties
                     THEN NULL ELSE public.graph_nodes.embedding END,
    embedded_at = CASE WHEN public.graph_nodes.label IS DISTINCT FROM EXCLUDED.label
                         OR public.graph_nodes.properties IS DISTINCT FROM EXCLUDED.properties
                       THEN NULL ELSE public.graph_nodes.embedded_at END
  RETURNING id INTO _node_id;
  RETURN _node_id;
END;
$$;

-- 4. UPSERT EDGE
CREATE OR REPLACE FUNCTION public.upsert_graph_edge(
  _company_id uuid,
  _source_id uuid,
  _target_id uuid,
  _relation_type text,
  _weight numeric DEFAULT 1.0,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _source_id IS NULL OR _target_id IS NULL OR _source_id = _target_id THEN
    RETURN;
  END IF;
  INSERT INTO public.graph_edges (company_id, source_node_id, target_node_id, relation_type, weight, metadata)
  VALUES (_company_id, _source_id, _target_id, _relation_type, COALESCE(_weight, 1.0), COALESCE(_metadata, '{}'::jsonb))
  ON CONFLICT (source_node_id, target_node_id, relation_type)
  DO UPDATE SET weight = EXCLUDED.weight, metadata = EXCLUDED.metadata;
END;
$$;

-- 5. SEMANTIC NODE LOOKUP
CREATE OR REPLACE FUNCTION public.match_graph_nodes(
  query_embedding vector,
  _company_id uuid,
  _node_types text[] DEFAULT NULL,
  match_count int DEFAULT 10,
  similarity_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  node_id uuid,
  node_type text,
  entity_id uuid,
  label text,
  properties jsonb,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    n.id, n.node_type, n.entity_id, n.label, n.properties,
    1 - (n.embedding <=> query_embedding) AS similarity
  FROM public.graph_nodes n
  WHERE n.company_id = _company_id
    AND n.embedding IS NOT NULL
    AND (_node_types IS NULL OR n.node_type = ANY(_node_types))
    AND 1 - (n.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY n.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 6. NEIGHBOR TRAVERSAL
CREATE OR REPLACE FUNCTION public.graph_neighbors(
  _node_id uuid,
  _hops int DEFAULT 1,
  _relation_types text[] DEFAULT NULL,
  _max_results int DEFAULT 50
)
RETURNS TABLE (
  node_id uuid,
  node_type text,
  entity_id uuid,
  label text,
  properties jsonb,
  distance int,
  via_relation text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE bfs AS (
    SELECT _node_id AS node_id, 0 AS distance, NULL::text AS via_relation
    UNION ALL
    SELECT
      CASE WHEN e.source_node_id = b.node_id THEN e.target_node_id ELSE e.source_node_id END,
      b.distance + 1,
      e.relation_type
    FROM bfs b
    JOIN public.graph_edges e
      ON (e.source_node_id = b.node_id OR e.target_node_id = b.node_id)
    WHERE b.distance < _hops
      AND (_relation_types IS NULL OR e.relation_type = ANY(_relation_types))
  )
  SELECT DISTINCT ON (n.id)
    n.id, n.node_type, n.entity_id, n.label, n.properties,
    b.distance, b.via_relation
  FROM bfs b
  JOIN public.graph_nodes n ON n.id = b.node_id
  WHERE b.distance > 0
  ORDER BY n.id, b.distance ASC
  LIMIT _max_results;
$$;

-- 7. SUBGRAPH FOR QUERY (hybrid GraphRAG)
CREATE OR REPLACE FUNCTION public.graph_subgraph_for_query(
  query_embedding vector,
  _company_id uuid,
  _max_hops int DEFAULT 2,
  _anchor_count int DEFAULT 5,
  _node_types text[] DEFAULT NULL
)
RETURNS TABLE (
  node_id uuid,
  node_type text,
  entity_id uuid,
  label text,
  properties jsonb,
  anchor_id uuid,
  distance int,
  score float
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE anchors AS (
    SELECT m.node_id AS anchor_id, m.similarity
    FROM public.match_graph_nodes(query_embedding, _company_id, _node_types, _anchor_count, 0.4) m
  ),
  bfs AS (
    SELECT a.anchor_id, a.anchor_id AS node_id, 0 AS distance, a.similarity AS sim
    FROM anchors a
    UNION ALL
    SELECT b.anchor_id,
      CASE WHEN e.source_node_id = b.node_id THEN e.target_node_id ELSE e.source_node_id END,
      b.distance + 1,
      b.sim
    FROM bfs b
    JOIN public.graph_edges e
      ON (e.source_node_id = b.node_id OR e.target_node_id = b.node_id)
    WHERE b.distance < _max_hops
  ),
  scored AS (
    SELECT b.node_id, b.anchor_id, MIN(b.distance) AS distance, MAX(b.sim) AS sim
    FROM bfs b
    GROUP BY b.node_id, b.anchor_id
  )
  SELECT n.id, n.node_type, n.entity_id, n.label, n.properties,
    s.anchor_id, s.distance,
    (s.sim * power(0.6, s.distance))::float AS score
  FROM scored s
  JOIN public.graph_nodes n ON n.id = s.node_id
  WHERE n.company_id = _company_id
  ORDER BY score DESC
  LIMIT 100;
$$;
