
-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  start_date DATE,
  end_date DATE,
  budget NUMERIC DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_campaigns_company_id ON public.campaigns(company_id);
CREATE INDEX idx_campaigns_client_id ON public.campaigns(client_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view campaigns in their company"
ON public.campaigns FOR SELECT TO authenticated
USING (
  company_id IN (
    SELECT ucr.company_id FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.status = 'active'
  )
);

CREATE POLICY "Admins/managers can insert campaigns"
ON public.campaigns FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_or_manager(auth.uid())
  AND company_id IN (
    SELECT ucr.company_id FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.status = 'active'
  )
);

CREATE POLICY "Admins/managers can update campaigns"
ON public.campaigns FOR UPDATE TO authenticated
USING (
  public.is_admin_or_manager(auth.uid())
  AND company_id IN (
    SELECT ucr.company_id FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.status = 'active'
  )
);

CREATE POLICY "Admins/managers can delete campaigns"
ON public.campaigns FOR DELETE TO authenticated
USING (
  public.is_admin_or_manager(auth.uid())
  AND company_id IN (
    SELECT ucr.company_id FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.status = 'active'
  )
);

-- Updated_at trigger
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
