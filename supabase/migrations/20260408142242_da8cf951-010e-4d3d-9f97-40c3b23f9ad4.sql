
CREATE TABLE public.project_financial_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  costing_at TIMESTAMPTZ,
  costing_amount NUMERIC,
  costing_notes TEXT,

  proposal_sent_at TIMESTAMPTZ,
  proposal_amount NUMERIC,
  proposal_reference TEXT,

  proposal_accepted_at TIMESTAMPTZ,
  proposal_rejected_at TIMESTAMPTZ,

  delivery_at TIMESTAMPTZ,
  delivery_notes TEXT,

  invoiced_at TIMESTAMPTZ,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,

  collected_at TIMESTAMPTZ,
  collected_amount NUMERIC,

  is_internal_costing BOOLEAN NOT NULL DEFAULT false,

  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(project_id)
);

ALTER TABLE public.project_financial_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestones for accessible projects"
  ON public.project_financial_milestones FOR SELECT
  TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can insert milestones for accessible projects"
  ON public.project_financial_milestones FOR INSERT
  TO authenticated
  WITH CHECK (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can update milestones for accessible projects"
  ON public.project_financial_milestones FOR UPDATE
  TO authenticated
  USING (public.has_project_access(auth.uid(), project_id))
  WITH CHECK (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can delete milestones for accessible projects"
  ON public.project_financial_milestones FOR DELETE
  TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));

CREATE TRIGGER update_financial_milestones_updated_at
  BEFORE UPDATE ON public.project_financial_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
