-- Fix: Replace public SELECT policy on tender_tasks with company-scoped access
DROP POLICY IF EXISTS "Users can view tender tasks" ON public.tender_tasks;

CREATE POLICY "Users can view tender tasks from their company"
ON public.tender_tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenders t
    JOIN public.user_company_roles ucr ON ucr.company_id = t.company_id
    WHERE t.id = tender_tasks.tender_id
    AND ucr.user_id = auth.uid()
    AND ucr.status = 'active'
  )
  OR is_admin_or_manager(auth.uid())
);

-- Also fix tender_deliverables which has same issue
DROP POLICY IF EXISTS "Users can view tender deliverables" ON public.tender_deliverables;

CREATE POLICY "Users can view tender deliverables from their company"
ON public.tender_deliverables
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenders t
    JOIN public.user_company_roles ucr ON ucr.company_id = t.company_id
    WHERE t.id = tender_deliverables.tender_id
    AND ucr.user_id = auth.uid()
    AND ucr.status = 'active'
  )
  OR is_admin_or_manager(auth.uid())
);