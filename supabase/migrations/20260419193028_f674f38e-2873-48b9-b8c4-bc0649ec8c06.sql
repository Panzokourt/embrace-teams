CREATE TABLE public.client_enrichment_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  suggestion_count integer NOT NULL DEFAULT 0,
  sources jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_enrichment_log_company_date
  ON public.client_enrichment_log (company_id, created_at DESC);

ALTER TABLE public.client_enrichment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members can view enrichment log"
  ON public.client_enrichment_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
        AND ucr.company_id = client_enrichment_log.company_id
        AND ucr.status = 'active'
    )
  );

CREATE POLICY "service role can insert enrichment log"
  ON public.client_enrichment_log
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);