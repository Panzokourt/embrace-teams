-- Create table to store AI suggestions for tenders
CREATE TABLE public.tender_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('deliverable', 'task', 'invoice')),
  data JSONB NOT NULL,
  selected BOOLEAN NOT NULL DEFAULT true,
  applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_tender_suggestions_tender_id ON public.tender_suggestions(tender_id);
CREATE INDEX idx_tender_suggestions_type ON public.tender_suggestions(suggestion_type);

-- Enable RLS
ALTER TABLE public.tender_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies - same access as tenders (admin/manager can manage)
CREATE POLICY "Admins and managers can view tender suggestions"
  ON public.tender_suggestions
  FOR SELECT
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can insert tender suggestions"
  ON public.tender_suggestions
  FOR INSERT
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can update tender suggestions"
  ON public.tender_suggestions
  FOR UPDATE
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can delete tender suggestions"
  ON public.tender_suggestions
  FOR DELETE
  USING (public.is_admin_or_manager(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tender_suggestions_updated_at
  BEFORE UPDATE ON public.tender_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();