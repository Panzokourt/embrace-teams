-- Create table for tender deliverables
CREATE TABLE public.tender_deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  budget NUMERIC DEFAULT 0,
  due_date DATE,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for tender tasks
CREATE TABLE public.tender_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  tender_deliverable_id UUID REFERENCES public.tender_deliverables(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'completed')),
  due_date DATE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.tender_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for tender_deliverables
CREATE POLICY "Users can view tender deliverables" 
ON public.tender_deliverables 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and managers can create tender deliverables" 
ON public.tender_deliverables 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can update tender deliverables" 
ON public.tender_deliverables 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can delete tender deliverables" 
ON public.tender_deliverables 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- RLS policies for tender_tasks
CREATE POLICY "Users can view tender tasks" 
ON public.tender_tasks 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and managers can create tender tasks" 
ON public.tender_tasks 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can update tender tasks" 
ON public.tender_tasks 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can delete tender tasks" 
ON public.tender_tasks 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Create indexes for better performance
CREATE INDEX idx_tender_deliverables_tender_id ON public.tender_deliverables(tender_id);
CREATE INDEX idx_tender_tasks_tender_id ON public.tender_tasks(tender_id);
CREATE INDEX idx_tender_tasks_deliverable_id ON public.tender_tasks(tender_deliverable_id);
CREATE INDEX idx_tender_tasks_assigned_to ON public.tender_tasks(assigned_to);

-- Trigger for updating timestamps
CREATE TRIGGER update_tender_deliverables_updated_at
BEFORE UPDATE ON public.tender_deliverables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tender_tasks_updated_at
BEFORE UPDATE ON public.tender_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();