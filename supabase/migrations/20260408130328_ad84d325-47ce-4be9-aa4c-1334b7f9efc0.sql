-- Fix 1: Remove overly permissive SELECT on api_keys (restrict to admins only)
DROP POLICY IF EXISTS "Company members can view api keys" ON public.api_keys;

-- Fix 2: Remove overly permissive SELECT on webhooks (restrict to admins only)
DROP POLICY IF EXISTS "Company members can view webhooks" ON public.webhooks;