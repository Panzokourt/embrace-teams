
ALTER TABLE public.tasks 
  ALTER COLUMN start_date TYPE timestamp with time zone USING start_date::timestamp with time zone,
  ALTER COLUMN due_date TYPE timestamp with time zone USING due_date::timestamp with time zone;
