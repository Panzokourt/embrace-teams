
-- Document type enum
CREATE TYPE public.document_type AS ENUM (
  'contract','brief','proposal','report','invoice',
  'presentation','creative','vendor_doc','correspondence','other'
);

-- Add columns to file_attachments
ALTER TABLE public.file_attachments
  ADD COLUMN document_type public.document_type DEFAULT 'other',
  ADD COLUMN ai_analysis jsonb;

-- Project folder templates (customizable per org)
CREATE TABLE public.project_folder_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  document_type public.document_type,
  sort_order integer DEFAULT 0,
  is_default boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.project_folder_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage folder templates"
  ON public.project_folder_templates FOR ALL TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company members can read folder templates"
  ON public.project_folder_templates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_company_roles
    WHERE user_id = auth.uid() AND company_id = project_folder_templates.company_id AND status = 'active'
  ));

-- Project contracts
CREATE TABLE public.project_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_attachment_id uuid REFERENCES file_attachments(id) ON DELETE SET NULL,
  contract_type text,
  parties jsonb DEFAULT '[]',
  start_date date,
  end_date date,
  value numeric,
  status text DEFAULT 'active',
  extracted_data jsonb DEFAULT '{}',
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.project_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view project contracts"
  ON public.project_contracts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_company_roles
    WHERE user_id = auth.uid() AND company_id = project_contracts.company_id AND status = 'active'
  ));

CREATE POLICY "Company admins can manage project contracts"
  ON public.project_contracts FOR ALL TO authenticated
  USING (public.is_company_admin_or_manager(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin_or_manager(auth.uid(), company_id));

-- Auto-create folders trigger
CREATE OR REPLACE FUNCTION public.auto_create_project_folders()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _templates RECORD;
  _has_custom boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM project_folder_templates WHERE company_id = NEW.company_id
  ) INTO _has_custom;

  IF _has_custom THEN
    FOR _templates IN
      SELECT name FROM project_folder_templates
      WHERE company_id = NEW.company_id ORDER BY sort_order
    LOOP
      INSERT INTO file_folders (project_id, name, created_by)
      VALUES (NEW.id, _templates.name, NEW.created_by);
    END LOOP;
  ELSE
    INSERT INTO file_folders (project_id, name, created_by) VALUES
      (NEW.id, 'Προτάσεις', NEW.created_by),
      (NEW.id, 'Παρουσιάσεις', NEW.created_by),
      (NEW.id, 'Προσφορές', NEW.created_by),
      (NEW.id, 'Συμβόλαια & Συμβάσεις', NEW.created_by),
      (NEW.id, 'Briefs', NEW.created_by),
      (NEW.id, 'Αναφορές', NEW.created_by),
      (NEW.id, 'Δημιουργικά', NEW.created_by),
      (NEW.id, 'Τιμολόγια & Παραστατικά', NEW.created_by),
      (NEW.id, 'Προμηθευτές', NEW.created_by),
      (NEW.id, 'Αλληλογραφία', NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_project_folders
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION auto_create_project_folders();
