
-- Leave Types table
CREATE TABLE public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text NOT NULL,
  code text NOT NULL,
  color text DEFAULT '#3B82F6',
  default_days integer DEFAULT 20,
  requires_approval boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view leave types" ON public.leave_types
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admin/Manager can manage leave types" ON public.leave_types
  FOR ALL USING (is_admin_or_manager(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Leave Balances table
CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  year integer NOT NULL,
  entitled_days numeric NOT NULL DEFAULT 0,
  used_days numeric NOT NULL DEFAULT 0,
  pending_days numeric NOT NULL DEFAULT 0,
  carried_over numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, leave_type_id, year)
);

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own balances" ON public.leave_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin/Manager can view all balances" ON public.leave_balances
  FOR SELECT USING (is_admin_or_manager(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admin/Manager can manage balances" ON public.leave_balances
  FOR ALL USING (is_admin_or_manager(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

CREATE TRIGGER update_leave_balances_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Leave Requests table
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_count numeric NOT NULL DEFAULT 1,
  half_day boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  reason text,
  reviewer_id uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests" ON public.leave_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own requests" ON public.leave_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_active_user(auth.uid()));

CREATE POLICY "Users can cancel own pending requests" ON public.leave_requests
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admin/Manager can view company requests" ON public.leave_requests
  FOR SELECT USING (is_admin_or_manager(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admin/Manager can manage requests" ON public.leave_requests
  FOR ALL USING (is_admin_or_manager(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- HR Documents table
CREATE TABLE public.hr_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  document_type text NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id),
  notes text,
  valid_from date,
  valid_until date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON public.hr_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin/Manager can view company documents" ON public.hr_documents
  FOR SELECT USING (is_admin_or_manager(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admin/Manager can manage documents" ON public.hr_documents
  FOR ALL USING (is_admin_or_manager(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- HR Documents storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('hr-documents', 'hr-documents', false);

CREATE POLICY "Users can view own HR docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'hr-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admin can view all HR docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'hr-documents' AND is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin can upload HR docs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'hr-documents' AND is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin can delete HR docs" ON storage.objects
  FOR DELETE USING (bucket_id = 'hr-documents' AND is_admin_or_manager(auth.uid()));

-- Enable realtime for leave_requests (for notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;
