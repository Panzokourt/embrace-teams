ALTER TABLE public.projects ADD COLUMN project_lead_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.projects ADD COLUMN account_manager_id uuid REFERENCES public.profiles(id);