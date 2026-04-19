DROP POLICY IF EXISTS "service role can insert enrichment log" ON public.client_enrichment_log;

CREATE POLICY "company members can insert enrichment log"
  ON public.client_enrichment_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
        AND ucr.company_id = client_enrichment_log.company_id
        AND ucr.status = 'active'
    )
  );