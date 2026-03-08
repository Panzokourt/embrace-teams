
ALTER TABLE public.intake_workflow_stages 
  ADD COLUMN IF NOT EXISTS responsible_roles TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS min_approvals INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sla_unit TEXT DEFAULT 'hours',
  ADD COLUMN IF NOT EXISTS sla_reason TEXT,
  ADD COLUMN IF NOT EXISTS field_set_type TEXT,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS notification_config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_template_id UUID REFERENCES public.project_templates(id) ON DELETE SET NULL;
