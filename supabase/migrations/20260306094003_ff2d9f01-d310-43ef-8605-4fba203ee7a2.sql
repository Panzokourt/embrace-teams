ALTER TABLE public.service_packages ADD COLUMN duration_type text NOT NULL DEFAULT 'monthly';
ALTER TABLE public.service_packages ADD COLUMN duration_value integer NOT NULL DEFAULT 1;