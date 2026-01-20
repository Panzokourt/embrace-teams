-- Create Enum for User Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'employee', 'client');

-- Create Enum for User Status
CREATE TYPE public.user_status AS ENUM ('pending', 'active', 'inactive');

-- Create Enum for Project Status
CREATE TYPE public.project_status AS ENUM ('tender', 'active', 'completed', 'cancelled');

-- Create Enum for Task Status
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'review', 'completed');

-- Create Enum for Tender Stage
CREATE TYPE public.tender_stage AS ENUM ('identification', 'preparation', 'submitted', 'evaluation', 'won', 'lost');

-- Profiles table - basic user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  status user_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles table - separate from profiles for security
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team Members junction table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

-- Clients table (organizations)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  status project_status NOT NULL DEFAULT 'active',
  budget DECIMAL(12, 2) DEFAULT 0,
  agency_fee_percentage DECIMAL(5, 2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project Team Access - which teams can access a project
CREATE TABLE public.project_team_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, team_id)
);

-- Project User Access - individual user access to projects
CREATE TABLE public.project_user_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

-- Client User Access - link clients (users) to their organizations
CREATE TABLE public.client_user_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id)
);

-- Tenders table (for διαγωνισμοί)
CREATE TABLE public.tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  stage tender_stage NOT NULL DEFAULT 'identification',
  budget DECIMAL(12, 2) DEFAULT 0,
  submission_deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deliverables table (Παραδοτέα)
CREATE TABLE public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  budget DECIMAL(12, 2) DEFAULT 0,
  cost DECIMAL(12, 2) DEFAULT 0,
  due_date DATE,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID REFERENCES public.deliverables(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid BOOLEAN DEFAULT false,
  paid_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_user_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_user_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Security Definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager')
  )
$$;

-- Function to check if user has project access
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Direct user access
    SELECT 1 FROM public.project_user_access
    WHERE user_id = _user_id AND project_id = _project_id
  ) OR EXISTS (
    -- Team-based access
    SELECT 1 FROM public.project_team_access pta
    JOIN public.team_members tm ON tm.team_id = pta.team_id
    WHERE tm.user_id = _user_id AND pta.project_id = _project_id
  ) OR EXISTS (
    -- Admin/Manager sees all
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'manager')
  )
$$;

-- Function to check if user is active
CREATE OR REPLACE FUNCTION public.is_active_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND status = 'active'
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admin/Manager can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin can update any profile"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Allow insert for authenticated users"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- User Roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Teams policies
CREATE POLICY "Active users can view teams"
ON public.teams FOR SELECT
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Admin/Manager can manage teams"
ON public.teams FOR ALL
USING (public.is_admin_or_manager(auth.uid()));

-- Team Members policies
CREATE POLICY "Active users can view team members"
ON public.team_members FOR SELECT
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Admin/Manager can manage team members"
ON public.team_members FOR ALL
USING (public.is_admin_or_manager(auth.uid()));

-- Clients policies
CREATE POLICY "Admin/Manager can view all clients"
ON public.clients FOR SELECT
USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Client users can view their organization"
ON public.clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_user_access
    WHERE client_id = clients.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Admin/Manager can manage clients"
ON public.clients FOR ALL
USING (public.is_admin_or_manager(auth.uid()));

-- Projects policies
CREATE POLICY "Users can view projects they have access to"
ON public.projects FOR SELECT
USING (public.has_project_access(auth.uid(), id));

CREATE POLICY "Admin/Manager can manage projects"
ON public.projects FOR ALL
USING (public.is_admin_or_manager(auth.uid()));

-- Client can view their projects
CREATE POLICY "Clients can view their projects"
ON public.projects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_user_access cua
    WHERE cua.user_id = auth.uid() AND cua.client_id = projects.client_id
  )
);

-- Project Team Access policies
CREATE POLICY "Active users can view project team access"
ON public.project_team_access FOR SELECT
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Admin/Manager can manage project team access"
ON public.project_team_access FOR ALL
USING (public.is_admin_or_manager(auth.uid()));

-- Project User Access policies
CREATE POLICY "Active users can view project user access"
ON public.project_user_access FOR SELECT
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Admin/Manager can manage project user access"
ON public.project_user_access FOR ALL
USING (public.is_admin_or_manager(auth.uid()));

-- Client User Access policies
CREATE POLICY "Admin can manage client user access"
ON public.client_user_access FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own client access"
ON public.client_user_access FOR SELECT
USING (auth.uid() = user_id);

-- Tenders policies
CREATE POLICY "Admin/Manager can view tenders"
ON public.tenders FOR SELECT
USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/Manager can manage tenders"
ON public.tenders FOR ALL
USING (public.is_admin_or_manager(auth.uid()));

-- Deliverables policies
CREATE POLICY "Users can view deliverables for their projects"
ON public.deliverables FOR SELECT
USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Admin/Manager can manage deliverables"
ON public.deliverables FOR ALL
USING (public.is_admin_or_manager(auth.uid()));

-- Tasks policies
CREATE POLICY "Users can view tasks for their projects"
ON public.tasks FOR SELECT
USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can view their assigned tasks"
ON public.tasks FOR SELECT
USING (auth.uid() = assigned_to);

CREATE POLICY "Admin/Manager can manage tasks"
ON public.tasks FOR ALL
USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Employees can update their assigned tasks"
ON public.tasks FOR UPDATE
USING (auth.uid() = assigned_to)
WITH CHECK (auth.uid() = assigned_to);

-- Invoices policies (only admin/manager can see)
CREATE POLICY "Admin/Manager can view invoices"
ON public.invoices FOR SELECT
USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Clients can view their invoices"
ON public.invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_user_access cua
    WHERE cua.user_id = auth.uid() AND cua.client_id = invoices.client_id
  )
);

CREATE POLICY "Admin/Manager can manage invoices"
ON public.invoices FOR ALL
USING (public.is_admin_or_manager(auth.uid()));

-- Expenses policies (only admin/manager can see)
CREATE POLICY "Admin/Manager can view expenses"
ON public.expenses FOR SELECT
USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/Manager can manage expenses"
ON public.expenses FOR ALL
USING (public.is_admin_or_manager(auth.uid()));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenders_updated_at
  BEFORE UPDATE ON public.tenders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deliverables_updated_at
  BEFORE UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();