
-- Contacts table
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) NOT NULL,
  name text NOT NULL,
  entity_type text DEFAULT 'person',
  email text,
  phone text,
  secondary_phone text,
  address text,
  website text,
  tax_id text,
  notes text,
  tags text[] DEFAULT '{}',
  category text DEFAULT 'other',
  client_id uuid REFERENCES public.clients(id),
  is_active boolean DEFAULT true,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view contacts" ON public.contacts
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admin/Manager can manage contacts" ON public.contacts
  FOR ALL USING (is_admin_or_manager(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Contact tags table
CREATE TABLE public.contact_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#3B82F6'
);

ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view contact tags" ON public.contact_tags
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admin/Manager can manage contact tags" ON public.contact_tags
  FOR ALL USING (is_admin_or_manager(auth.uid()) AND company_id = get_user_company_id(auth.uid()));

-- Project contact access table
CREATE TABLE public.project_contact_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'collaborator',
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, contact_id)
);

ALTER TABLE public.project_contact_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view project contacts" ON public.project_contact_access
  FOR SELECT USING (is_active_user(auth.uid()));

CREATE POLICY "Admin/Manager can manage project contacts" ON public.project_contact_access
  FOR ALL USING (is_admin_or_manager(auth.uid()));

-- Seed existing clients into contacts
INSERT INTO public.contacts (company_id, name, email, phone, address, notes, category, client_id, entity_type)
SELECT c.company_id, c.name, c.contact_email, c.contact_phone, c.address, c.notes, 'client', c.id, 'company'
FROM public.clients c
WHERE c.company_id IS NOT NULL;
