-- Phase 5 · GraphRAG · Sync Triggers (resilient · skips rows with NULL company)

CREATE OR REPLACE FUNCTION public._gr_company_for_project(_project_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.projects WHERE id = _project_id;
$$;

CREATE OR REPLACE FUNCTION public._gr_company_for_client(_client_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.clients WHERE id = _client_id;
$$;

-- ============= CLIENTS =============
CREATE OR REPLACE FUNCTION public.sync_graph_client()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.graph_nodes WHERE node_type='client' AND entity_id = OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.company_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.upsert_graph_node(
    NEW.company_id, 'client', NEW.id, NEW.name,
    jsonb_build_object('status', NEW.status, 'tags', NEW.tags)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_graph_clients ON public.clients;
CREATE TRIGGER trg_sync_graph_clients
AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.sync_graph_client();

-- ============= PROJECTS =============
CREATE OR REPLACE FUNCTION public.sync_graph_project()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _project_node uuid; _client_node uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.graph_nodes WHERE node_type='project' AND entity_id = OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.company_id IS NULL THEN RETURN NEW; END IF;
  _project_node := public.upsert_graph_node(
    NEW.company_id, 'project', NEW.id, NEW.name,
    jsonb_build_object('status', NEW.status, 'start_date', NEW.start_date, 'end_date', NEW.end_date, 'description', LEFT(COALESCE(NEW.description,''), 500))
  );
  IF NEW.client_id IS NOT NULL THEN
    SELECT id INTO _client_node FROM public.graph_nodes WHERE node_type='client' AND entity_id = NEW.client_id LIMIT 1;
    IF _client_node IS NOT NULL THEN
      PERFORM public.upsert_graph_edge(NEW.company_id, _project_node, _client_node, 'belongs_to', 1.0, '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_graph_projects ON public.projects;
CREATE TRIGGER trg_sync_graph_projects
AFTER INSERT OR UPDATE OR DELETE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.sync_graph_project();

-- ============= TASKS =============
CREATE OR REPLACE FUNCTION public.sync_graph_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _company_id uuid; _task_node uuid; _project_node uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.graph_nodes WHERE node_type='task' AND entity_id = OLD.id;
    RETURN OLD;
  END IF;
  _company_id := public._gr_company_for_project(NEW.project_id);
  IF _company_id IS NULL THEN RETURN NEW; END IF;
  _task_node := public.upsert_graph_node(
    _company_id, 'task', NEW.id, NEW.title,
    jsonb_build_object('status', NEW.status, 'due_date', NEW.due_date, 'assigned_to', NEW.assigned_to)
  );
  SELECT id INTO _project_node FROM public.graph_nodes WHERE node_type='project' AND entity_id = NEW.project_id LIMIT 1;
  IF _project_node IS NOT NULL THEN
    PERFORM public.upsert_graph_edge(_company_id, _task_node, _project_node, 'belongs_to', 1.0, '{}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_graph_tasks ON public.tasks;
CREATE TRIGGER trg_sync_graph_tasks
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.sync_graph_task();

-- ============= CONTACTS =============
CREATE OR REPLACE FUNCTION public.sync_graph_contact()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _contact_node uuid; _client_node uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.graph_nodes WHERE node_type='contact' AND entity_id = OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.company_id IS NULL THEN RETURN NEW; END IF;
  _contact_node := public.upsert_graph_node(
    NEW.company_id, 'contact', NEW.id, NEW.name,
    jsonb_build_object('email', NEW.email, 'phone', NEW.phone, 'category', NEW.category, 'tags', NEW.tags)
  );
  IF NEW.client_id IS NOT NULL THEN
    SELECT id INTO _client_node FROM public.graph_nodes WHERE node_type='client' AND entity_id = NEW.client_id LIMIT 1;
    IF _client_node IS NOT NULL THEN
      PERFORM public.upsert_graph_edge(NEW.company_id, _contact_node, _client_node, 'belongs_to', 1.0, '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_graph_contacts ON public.contacts;
CREATE TRIGGER trg_sync_graph_contacts
AFTER INSERT OR UPDATE OR DELETE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.sync_graph_contact();

-- ============= INVOICES =============
CREATE OR REPLACE FUNCTION public.sync_graph_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _company_id uuid; _node uuid; _client_node uuid; _project_node uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.graph_nodes WHERE node_type='invoice' AND entity_id = OLD.id;
    RETURN OLD;
  END IF;
  _company_id := COALESCE(public._gr_company_for_project(NEW.project_id), public._gr_company_for_client(NEW.client_id));
  IF _company_id IS NULL THEN RETURN NEW; END IF;
  _node := public.upsert_graph_node(
    _company_id, 'invoice', NEW.id, 'Invoice ' || NEW.id::text,
    jsonb_build_object('status', NEW.status, 'amount', NEW.amount, 'due_date', NEW.due_date)
  );
  IF NEW.client_id IS NOT NULL THEN
    SELECT id INTO _client_node FROM public.graph_nodes WHERE node_type='client' AND entity_id = NEW.client_id LIMIT 1;
    IF _client_node IS NOT NULL THEN
      PERFORM public.upsert_graph_edge(_company_id, _node, _client_node, 'belongs_to', 1.0, '{}'::jsonb);
    END IF;
  END IF;
  IF NEW.project_id IS NOT NULL THEN
    SELECT id INTO _project_node FROM public.graph_nodes WHERE node_type='project' AND entity_id = NEW.project_id LIMIT 1;
    IF _project_node IS NOT NULL THEN
      PERFORM public.upsert_graph_edge(_company_id, _node, _project_node, 'belongs_to', 1.0, '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_graph_invoices ON public.invoices;
CREATE TRIGGER trg_sync_graph_invoices
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.sync_graph_invoice();

-- ============= CAMPAIGNS =============
CREATE OR REPLACE FUNCTION public.sync_graph_campaign()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _node uuid; _client_node uuid; _project_node uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.graph_nodes WHERE node_type='campaign' AND entity_id = OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.company_id IS NULL THEN RETURN NEW; END IF;
  _node := public.upsert_graph_node(
    NEW.company_id, 'campaign', NEW.id, NEW.name,
    jsonb_build_object('status', NEW.status, 'start_date', NEW.start_date, 'end_date', NEW.end_date, 'description', LEFT(COALESCE(NEW.description,''),300))
  );
  IF NEW.client_id IS NOT NULL THEN
    SELECT id INTO _client_node FROM public.graph_nodes WHERE node_type='client' AND entity_id = NEW.client_id LIMIT 1;
    IF _client_node IS NOT NULL THEN
      PERFORM public.upsert_graph_edge(NEW.company_id, _node, _client_node, 'belongs_to', 1.0, '{}'::jsonb);
    END IF;
  END IF;
  IF NEW.project_id IS NOT NULL THEN
    SELECT id INTO _project_node FROM public.graph_nodes WHERE node_type='project' AND entity_id = NEW.project_id LIMIT 1;
    IF _project_node IS NOT NULL THEN
      PERFORM public.upsert_graph_edge(NEW.company_id, _node, _project_node, 'belongs_to', 1.0, '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_graph_campaigns ON public.campaigns;
CREATE TRIGGER trg_sync_graph_campaigns
AFTER INSERT OR UPDATE OR DELETE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.sync_graph_campaign();

-- ============= KB ARTICLES =============
CREATE OR REPLACE FUNCTION public.sync_graph_kb_article()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _node uuid; _client_node uuid; _project_node uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.graph_nodes WHERE node_type='kb_article' AND entity_id = OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.company_id IS NULL THEN RETURN NEW; END IF;
  _node := public.upsert_graph_node(
    NEW.company_id, 'kb_article', NEW.id, NEW.title,
    jsonb_build_object('status', NEW.status, 'tags', NEW.tags, 'category_id', NEW.category_id)
  );
  IF NEW.client_id IS NOT NULL THEN
    SELECT id INTO _client_node FROM public.graph_nodes WHERE node_type='client' AND entity_id = NEW.client_id LIMIT 1;
    IF _client_node IS NOT NULL THEN
      PERFORM public.upsert_graph_edge(NEW.company_id, _node, _client_node, 'references', 0.7, '{}'::jsonb);
    END IF;
  END IF;
  IF NEW.project_id IS NOT NULL THEN
    SELECT id INTO _project_node FROM public.graph_nodes WHERE node_type='project' AND entity_id = NEW.project_id LIMIT 1;
    IF _project_node IS NOT NULL THEN
      PERFORM public.upsert_graph_edge(NEW.company_id, _node, _project_node, 'references', 0.7, '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_graph_kb_articles ON public.kb_articles;
CREATE TRIGGER trg_sync_graph_kb_articles
AFTER INSERT OR UPDATE OR DELETE ON public.kb_articles
FOR EACH ROW EXECUTE FUNCTION public.sync_graph_kb_article();

-- ============= MEDIA PLANS =============
CREATE OR REPLACE FUNCTION public.sync_graph_media_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _node uuid; _client_node uuid; _project_node uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.graph_nodes WHERE node_type='media_plan' AND entity_id = OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.company_id IS NULL THEN RETURN NEW; END IF;
  _node := public.upsert_graph_node(
    NEW.company_id, 'media_plan', NEW.id, NEW.name,
    jsonb_build_object('status', NEW.status, 'description', LEFT(COALESCE(NEW.description,''),300))
  );
  IF NEW.client_id IS NOT NULL THEN
    SELECT id INTO _client_node FROM public.graph_nodes WHERE node_type='client' AND entity_id = NEW.client_id LIMIT 1;
    IF _client_node IS NOT NULL THEN
      PERFORM public.upsert_graph_edge(NEW.company_id, _node, _client_node, 'belongs_to', 1.0, '{}'::jsonb);
    END IF;
  END IF;
  IF NEW.project_id IS NOT NULL THEN
    SELECT id INTO _project_node FROM public.graph_nodes WHERE node_type='project' AND entity_id = NEW.project_id LIMIT 1;
    IF _project_node IS NOT NULL THEN
      PERFORM public.upsert_graph_edge(NEW.company_id, _node, _project_node, 'belongs_to', 1.0, '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_graph_media_plans ON public.media_plans;
CREATE TRIGGER trg_sync_graph_media_plans
AFTER INSERT OR UPDATE OR DELETE ON public.media_plans
FOR EACH ROW EXECUTE FUNCTION public.sync_graph_media_plan();

-- ============= SERVICES =============
CREATE OR REPLACE FUNCTION public.sync_graph_service()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.graph_nodes WHERE node_type='service' AND entity_id = OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.company_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.upsert_graph_node(
    NEW.company_id, 'service', NEW.id, NEW.name,
    jsonb_build_object('category', NEW.category, 'description', LEFT(COALESCE(NEW.description,''),300))
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_graph_services ON public.services;
CREATE TRIGGER trg_sync_graph_services
AFTER INSERT OR UPDATE OR DELETE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.sync_graph_service();

-- ============= EXPENSES =============
CREATE OR REPLACE FUNCTION public.sync_graph_expense()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _company_id uuid; _node uuid; _client_node uuid; _project_node uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.graph_nodes WHERE node_type='expense' AND entity_id = OLD.id;
    RETURN OLD;
  END IF;
  _company_id := COALESCE(public._gr_company_for_project(NEW.project_id), public._gr_company_for_client(NEW.client_id));
  IF _company_id IS NULL THEN RETURN NEW; END IF;
  _node := public.upsert_graph_node(
    _company_id, 'expense', NEW.id, COALESCE(NEW.description, 'Expense ' || NEW.id::text),
    jsonb_build_object('amount', NEW.amount, 'category', NEW.category)
  );
  IF NEW.client_id IS NOT NULL THEN
    SELECT id INTO _client_node FROM public.graph_nodes WHERE node_type='client' AND entity_id = NEW.client_id LIMIT 1;
    IF _client_node IS NOT NULL THEN
      PERFORM public.upsert_graph_edge(_company_id, _node, _client_node, 'belongs_to', 0.8, '{}'::jsonb);
    END IF;
  END IF;
  IF NEW.project_id IS NOT NULL THEN
    SELECT id INTO _project_node FROM public.graph_nodes WHERE node_type='project' AND entity_id = NEW.project_id LIMIT 1;
    IF _project_node IS NOT NULL THEN
      PERFORM public.upsert_graph_edge(_company_id, _node, _project_node, 'belongs_to', 0.8, '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_graph_expenses ON public.expenses;
CREATE TRIGGER trg_sync_graph_expenses
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.sync_graph_expense();

-- ============================================================
-- INITIAL BACKFILL · skips rows with NULL company_id
-- ============================================================

INSERT INTO public.graph_nodes (company_id, node_type, entity_id, label, properties)
SELECT company_id, 'client', id, name, jsonb_build_object('status', status, 'tags', tags)
FROM public.clients WHERE company_id IS NOT NULL
ON CONFLICT (company_id, node_type, entity_id) DO NOTHING;

INSERT INTO public.graph_nodes (company_id, node_type, entity_id, label, properties)
SELECT company_id, 'project', id, name,
  jsonb_build_object('status', status, 'start_date', start_date, 'end_date', end_date,
                     'description', LEFT(COALESCE(description,''), 500))
FROM public.projects WHERE company_id IS NOT NULL
ON CONFLICT (company_id, node_type, entity_id) DO NOTHING;

INSERT INTO public.graph_nodes (company_id, node_type, entity_id, label, properties)
SELECT public._gr_company_for_project(t.project_id), 'task', t.id, t.title,
  jsonb_build_object('status', t.status, 'due_date', t.due_date, 'assigned_to', t.assigned_to)
FROM public.tasks t
WHERE public._gr_company_for_project(t.project_id) IS NOT NULL
ON CONFLICT (company_id, node_type, entity_id) DO NOTHING;

INSERT INTO public.graph_nodes (company_id, node_type, entity_id, label, properties)
SELECT company_id, 'contact', id, name,
  jsonb_build_object('email', email, 'phone', phone, 'category', category, 'tags', tags)
FROM public.contacts WHERE company_id IS NOT NULL
ON CONFLICT (company_id, node_type, entity_id) DO NOTHING;

INSERT INTO public.graph_nodes (company_id, node_type, entity_id, label, properties)
SELECT COALESCE(public._gr_company_for_project(i.project_id), public._gr_company_for_client(i.client_id)),
  'invoice', i.id, 'Invoice ' || i.id::text,
  jsonb_build_object('status', i.status, 'amount', i.amount, 'due_date', i.due_date)
FROM public.invoices i
WHERE COALESCE(public._gr_company_for_project(i.project_id), public._gr_company_for_client(i.client_id)) IS NOT NULL
ON CONFLICT (company_id, node_type, entity_id) DO NOTHING;

INSERT INTO public.graph_nodes (company_id, node_type, entity_id, label, properties)
SELECT company_id, 'campaign', id, name,
  jsonb_build_object('status', status, 'start_date', start_date, 'end_date', end_date,
                     'description', LEFT(COALESCE(description,''),300))
FROM public.campaigns WHERE company_id IS NOT NULL
ON CONFLICT (company_id, node_type, entity_id) DO NOTHING;

INSERT INTO public.graph_nodes (company_id, node_type, entity_id, label, properties)
SELECT company_id, 'kb_article', id, title,
  jsonb_build_object('status', status, 'tags', tags, 'category_id', category_id)
FROM public.kb_articles WHERE company_id IS NOT NULL
ON CONFLICT (company_id, node_type, entity_id) DO NOTHING;

INSERT INTO public.graph_nodes (company_id, node_type, entity_id, label, properties)
SELECT company_id, 'media_plan', id, name,
  jsonb_build_object('status', status, 'description', LEFT(COALESCE(description,''),300))
FROM public.media_plans WHERE company_id IS NOT NULL
ON CONFLICT (company_id, node_type, entity_id) DO NOTHING;

INSERT INTO public.graph_nodes (company_id, node_type, entity_id, label, properties)
SELECT company_id, 'service', id, name,
  jsonb_build_object('category', category, 'description', LEFT(COALESCE(description,''),300))
FROM public.services WHERE company_id IS NOT NULL
ON CONFLICT (company_id, node_type, entity_id) DO NOTHING;

INSERT INTO public.graph_nodes (company_id, node_type, entity_id, label, properties)
SELECT COALESCE(public._gr_company_for_project(e.project_id), public._gr_company_for_client(e.client_id)),
  'expense', e.id, COALESCE(e.description, 'Expense ' || e.id::text),
  jsonb_build_object('amount', e.amount, 'category', e.category)
FROM public.expenses e
WHERE COALESCE(public._gr_company_for_project(e.project_id), public._gr_company_for_client(e.client_id)) IS NOT NULL
ON CONFLICT (company_id, node_type, entity_id) DO NOTHING;

-- ============================================================
-- BACKFILL EDGES
-- ============================================================

INSERT INTO public.graph_edges (company_id, source_node_id, target_node_id, relation_type, weight)
SELECT pn.company_id, pn.id, cn.id, 'belongs_to', 1.0
FROM public.graph_nodes pn
JOIN public.projects p ON p.id = pn.entity_id AND pn.node_type='project'
JOIN public.graph_nodes cn ON cn.entity_id = p.client_id AND cn.node_type='client'
ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING;

INSERT INTO public.graph_edges (company_id, source_node_id, target_node_id, relation_type, weight)
SELECT tn.company_id, tn.id, pn.id, 'belongs_to', 1.0
FROM public.graph_nodes tn
JOIN public.tasks t ON t.id = tn.entity_id AND tn.node_type='task'
JOIN public.graph_nodes pn ON pn.entity_id = t.project_id AND pn.node_type='project'
ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING;

INSERT INTO public.graph_edges (company_id, source_node_id, target_node_id, relation_type, weight)
SELECT cnt.company_id, cnt.id, cln.id, 'belongs_to', 1.0
FROM public.graph_nodes cnt
JOIN public.contacts c ON c.id = cnt.entity_id AND cnt.node_type='contact'
JOIN public.graph_nodes cln ON cln.entity_id = c.client_id AND cln.node_type='client'
ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING;

INSERT INTO public.graph_edges (company_id, source_node_id, target_node_id, relation_type, weight)
SELECT inv.company_id, inv.id, cln.id, 'belongs_to', 1.0
FROM public.graph_nodes inv
JOIN public.invoices i ON i.id = inv.entity_id AND inv.node_type='invoice'
JOIN public.graph_nodes cln ON cln.entity_id = i.client_id AND cln.node_type='client'
ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING;

INSERT INTO public.graph_edges (company_id, source_node_id, target_node_id, relation_type, weight)
SELECT inv.company_id, inv.id, pn.id, 'belongs_to', 1.0
FROM public.graph_nodes inv
JOIN public.invoices i ON i.id = inv.entity_id AND inv.node_type='invoice'
JOIN public.graph_nodes pn ON pn.entity_id = i.project_id AND pn.node_type='project'
ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING;

INSERT INTO public.graph_edges (company_id, source_node_id, target_node_id, relation_type, weight)
SELECT cmp.company_id, cmp.id, cln.id, 'belongs_to', 1.0
FROM public.graph_nodes cmp
JOIN public.campaigns c ON c.id = cmp.entity_id AND cmp.node_type='campaign'
JOIN public.graph_nodes cln ON cln.entity_id = c.client_id AND cln.node_type='client'
ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING;

INSERT INTO public.graph_edges (company_id, source_node_id, target_node_id, relation_type, weight)
SELECT cmp.company_id, cmp.id, pn.id, 'belongs_to', 1.0
FROM public.graph_nodes cmp
JOIN public.campaigns c ON c.id = cmp.entity_id AND cmp.node_type='campaign'
JOIN public.graph_nodes pn ON pn.entity_id = c.project_id AND pn.node_type='project'
ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING;

INSERT INTO public.graph_edges (company_id, source_node_id, target_node_id, relation_type, weight)
SELECT kbn.company_id, kbn.id, cln.id, 'references', 0.7
FROM public.graph_nodes kbn
JOIN public.kb_articles a ON a.id = kbn.entity_id AND kbn.node_type='kb_article'
JOIN public.graph_nodes cln ON cln.entity_id = a.client_id AND cln.node_type='client'
ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING;

INSERT INTO public.graph_edges (company_id, source_node_id, target_node_id, relation_type, weight)
SELECT kbn.company_id, kbn.id, pn.id, 'references', 0.7
FROM public.graph_nodes kbn
JOIN public.kb_articles a ON a.id = kbn.entity_id AND kbn.node_type='kb_article'
JOIN public.graph_nodes pn ON pn.entity_id = a.project_id AND pn.node_type='project'
ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING;

INSERT INTO public.graph_edges (company_id, source_node_id, target_node_id, relation_type, weight)
SELECT mpn.company_id, mpn.id, cln.id, 'belongs_to', 1.0
FROM public.graph_nodes mpn
JOIN public.media_plans m ON m.id = mpn.entity_id AND mpn.node_type='media_plan'
JOIN public.graph_nodes cln ON cln.entity_id = m.client_id AND cln.node_type='client'
ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING;

INSERT INTO public.graph_edges (company_id, source_node_id, target_node_id, relation_type, weight)
SELECT mpn.company_id, mpn.id, pn.id, 'belongs_to', 1.0
FROM public.graph_nodes mpn
JOIN public.media_plans m ON m.id = mpn.entity_id AND mpn.node_type='media_plan'
JOIN public.graph_nodes pn ON pn.entity_id = m.project_id AND pn.node_type='project'
ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING;

INSERT INTO public.graph_edges (company_id, source_node_id, target_node_id, relation_type, weight)
SELECT exp.company_id, exp.id, cln.id, 'belongs_to', 0.8
FROM public.graph_nodes exp
JOIN public.expenses e ON e.id = exp.entity_id AND exp.node_type='expense'
JOIN public.graph_nodes cln ON cln.entity_id = e.client_id AND cln.node_type='client'
ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING;

INSERT INTO public.graph_edges (company_id, source_node_id, target_node_id, relation_type, weight)
SELECT exp.company_id, exp.id, pn.id, 'belongs_to', 0.8
FROM public.graph_nodes exp
JOIN public.expenses e ON e.id = exp.entity_id AND exp.node_type='expense'
JOIN public.graph_nodes pn ON pn.entity_id = e.project_id AND pn.node_type='project'
ON CONFLICT (source_node_id, target_node_id, relation_type) DO NOTHING;
