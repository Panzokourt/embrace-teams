
-- Create a trigger function that auto-assigns internal projects to an "Internal" folder
CREATE OR REPLACE FUNCTION public.auto_assign_internal_project_folder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _folder_id UUID;
BEGIN
  -- Only act on internal projects
  IF NEW.is_internal IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Find existing "Internal" folder for this company
  SELECT id INTO _folder_id
  FROM public.project_folders
  WHERE company_id = NEW.company_id
    AND name = 'Internal'
    AND parent_folder_id IS NULL
  LIMIT 1;

  -- Create it if it doesn't exist
  IF _folder_id IS NULL THEN
    INSERT INTO public.project_folders (company_id, name, color, sort_order)
    VALUES (NEW.company_id, 'Internal', '#6B7280', 0)
    RETURNING id INTO _folder_id;
  END IF;

  -- Assign folder to the project (only if not already in a folder)
  IF NEW.folder_id IS NULL THEN
    NEW.folder_id := _folder_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger BEFORE INSERT so we can modify NEW.folder_id
CREATE TRIGGER trg_auto_assign_internal_folder
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_internal_project_folder();

-- Also handle UPDATE: if a project is changed to internal, move it
CREATE OR REPLACE FUNCTION public.auto_assign_internal_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _folder_id UUID;
BEGIN
  -- Only act when is_internal changes from false to true
  IF NEW.is_internal IS TRUE AND (OLD.is_internal IS NOT TRUE) THEN
    SELECT id INTO _folder_id
    FROM public.project_folders
    WHERE company_id = NEW.company_id
      AND name = 'Internal'
      AND parent_folder_id IS NULL
    LIMIT 1;

    IF _folder_id IS NULL THEN
      INSERT INTO public.project_folders (company_id, name, color, sort_order)
      VALUES (NEW.company_id, 'Internal', '#6B7280', 0)
      RETURNING id INTO _folder_id;
    END IF;

    NEW.folder_id := _folder_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_internal_on_update
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_internal_on_update();
