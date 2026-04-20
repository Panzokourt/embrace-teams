-- 1. Add company_id columns
ALTER TABLE public.file_folders ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.file_attachments ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_file_folders_company_id ON public.file_folders(company_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_company_id ON public.file_attachments(company_id);

-- 2. Replace the check constraint to allow exactly one scope
ALTER TABLE public.file_folders DROP CONSTRAINT IF EXISTS folder_entity_check;
ALTER TABLE public.file_folders ADD CONSTRAINT folder_entity_check CHECK (
  ((tender_id IS NOT NULL)::int + (project_id IS NOT NULL)::int + (company_id IS NOT NULL)::int) = 1
);

-- 3. RLS policies for company-scoped folders
DROP POLICY IF EXISTS "Users can view company folders" ON public.file_folders;
CREATE POLICY "Users can view company folders"
ON public.file_folders FOR SELECT
USING (
  company_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = file_folders.company_id
      AND ucr.status = 'active'
  )
);

DROP POLICY IF EXISTS "Members can manage company folders" ON public.file_folders;
CREATE POLICY "Members can manage company folders"
ON public.file_folders FOR ALL
USING (
  company_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = file_folders.company_id
      AND ucr.status = 'active'
  )
)
WITH CHECK (
  company_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = file_folders.company_id
      AND ucr.status = 'active'
  )
);

-- 4. RLS policies for company-scoped attachments
DROP POLICY IF EXISTS "Users can view company files" ON public.file_attachments;
CREATE POLICY "Users can view company files"
ON public.file_attachments FOR SELECT
USING (
  company_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = file_attachments.company_id
      AND ucr.status = 'active'
  )
);

DROP POLICY IF EXISTS "Members can manage company files" ON public.file_attachments;
CREATE POLICY "Members can manage company files"
ON public.file_attachments FOR ALL
USING (
  company_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = file_attachments.company_id
      AND ucr.status = 'active'
  )
)
WITH CHECK (
  company_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = file_attachments.company_id
      AND ucr.status = 'active'
  )
);

-- 5. Idempotent function to ensure company root folders
CREATE OR REPLACE FUNCTION public.ensure_company_root_folders(_company_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _root_id uuid;
  _has_access boolean;
  _has_custom boolean;
  _tpl RECORD;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify membership
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
  ) INTO _has_access;

  IF NOT _has_access THEN
    RAISE EXCEPTION 'No access to this company';
  END IF;

  -- Find existing root "Εταιρία" folder
  SELECT id INTO _root_id
  FROM public.file_folders
  WHERE company_id = _company_id
    AND parent_folder_id IS NULL
    AND name = 'Εταιρία'
  LIMIT 1;

  IF _root_id IS NOT NULL THEN
    RETURN _root_id;
  END IF;

  -- Create root
  INSERT INTO public.file_folders (company_id, parent_folder_id, name, color, created_by)
  VALUES (_company_id, NULL, 'Εταιρία', '#6366F1', _user_id)
  RETURNING id INTO _root_id;

  -- Create subfolders from templates
  SELECT EXISTS(
    SELECT 1 FROM public.project_folder_templates WHERE company_id = _company_id
  ) INTO _has_custom;

  IF _has_custom THEN
    FOR _tpl IN
      SELECT name FROM public.project_folder_templates
      WHERE company_id = _company_id ORDER BY sort_order
    LOOP
      INSERT INTO public.file_folders (company_id, parent_folder_id, name, created_by)
      VALUES (_company_id, _root_id, _tpl.name, _user_id);
    END LOOP;
  ELSE
    INSERT INTO public.file_folders (company_id, parent_folder_id, name, created_by) VALUES
      (_company_id, _root_id, 'HR & Personnel', _user_id),
      (_company_id, _root_id, 'Templates', _user_id),
      (_company_id, _root_id, 'Brand Assets', _user_id),
      (_company_id, _root_id, 'Internal Docs', _user_id),
      (_company_id, _root_id, 'Finance', _user_id),
      (_company_id, _root_id, 'Legal', _user_id);
  END IF;

  RETURN _root_id;
END;
$$;