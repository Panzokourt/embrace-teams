
-- Create project_categories table
CREATE TABLE public.project_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#3B82F6',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;

-- SELECT: active users in same company
CREATE POLICY "Active users can view project categories"
  ON public.project_categories
  FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

-- ALL: admin/manager in same company
CREATE POLICY "Admin/Manager can manage project categories"
  ON public.project_categories
  FOR ALL
  USING (is_admin_or_manager(auth.uid()) AND company_id = get_user_company_id(auth.uid()));
