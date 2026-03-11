-- Platform admins table
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Seed the creator
INSERT INTO public.platform_admins (email) VALUES ('koupant@gmail.com');

-- Security definer function to check platform admin status
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins pa
    JOIN auth.users u ON u.email = pa.email
    WHERE u.id = _user_id
  )
$$;

-- RLS: only platform admins can read the table
CREATE POLICY "Platform admins can read" ON public.platform_admins
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));