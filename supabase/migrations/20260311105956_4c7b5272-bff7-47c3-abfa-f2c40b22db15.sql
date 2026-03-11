
CREATE TABLE public.platform_admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.platform_admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can read audit log"
  ON public.platform_admin_audit_log FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "No direct inserts from client"
  ON public.platform_admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (false);
