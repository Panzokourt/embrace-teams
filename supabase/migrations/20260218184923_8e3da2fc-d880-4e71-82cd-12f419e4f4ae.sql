
-- Data migration: tenders -> projects

-- Tender 1: Πανεπιστήμιο Αιγαίου - Open Data (stage: evaluation -> proposal)
INSERT INTO public.projects (id, name, description, client_id, budget, status, submission_deadline, probability, tender_type, company_id, created_at, updated_at)
SELECT 
  t.id, t.name, t.description, t.client_id, t.budget, 
  'proposal'::project_status,
  t.submission_deadline, t.probability, t.tender_type, t.company_id, t.created_at, t.updated_at
FROM public.tenders t WHERE t.id = 'b66c0623-8db5-4d85-a39c-6a046646cb37'
ON CONFLICT (id) DO NOTHING;

-- Tender 2: CAMPEON Gaming (stage: won -> active, with won_date)
INSERT INTO public.projects (id, name, description, client_id, budget, status, submission_deadline, probability, tender_type, company_id, won_date, created_at, updated_at)
SELECT 
  t.id, t.name, t.description, t.client_id, t.budget, 
  'active'::project_status,
  t.submission_deadline, t.probability, t.tender_type, t.company_id, now()::date, t.created_at, t.updated_at
FROM public.tenders t WHERE t.id = '8f57d0f5-6b0e-4a8f-a918-b04f383ee70d'
ON CONFLICT (id) DO NOTHING;

-- Tender 3: Πανεπιστήμιο Αιγαίου - AI (stage: preparation -> lead)
INSERT INTO public.projects (id, name, description, client_id, budget, status, submission_deadline, probability, tender_type, company_id, created_at, updated_at)
SELECT 
  t.id, t.name, t.description, t.client_id, t.budget, 
  'lead'::project_status,
  t.submission_deadline, t.probability, t.tender_type, t.company_id, t.created_at, t.updated_at
FROM public.tenders t WHERE t.id = '00ef65bf-5b0f-4dfb-bcbf-0c17903bfc68'
ON CONFLICT (id) DO NOTHING;

-- Migrate tender_deliverables -> deliverables
INSERT INTO public.deliverables (id, project_id, name, description, budget, due_date, completed, created_at, updated_at)
SELECT td.id, td.tender_id, td.name, td.description, td.budget, td.due_date, td.completed, td.created_at, td.updated_at
FROM public.tender_deliverables td
ON CONFLICT (id) DO NOTHING;

-- Migrate tender_tasks -> tasks
INSERT INTO public.tasks (id, project_id, title, description, status, due_date, assigned_to, deliverable_id, created_at, updated_at)
SELECT 
  tt.id, tt.tender_id, tt.title, tt.description, 
  tt.status::task_status, 
  tt.due_date, tt.assigned_to, tt.tender_deliverable_id, tt.created_at, tt.updated_at
FROM public.tender_tasks tt
ON CONFLICT (id) DO NOTHING;

-- Migrate tender_team_access -> project_user_access
INSERT INTO public.project_user_access (project_id, user_id, created_at)
SELECT tta.tender_id, tta.user_id, tta.created_at
FROM public.tender_team_access tta
ON CONFLICT DO NOTHING;

-- Migrate file_attachments tender_id -> project_id
UPDATE public.file_attachments 
SET project_id = tender_id 
WHERE tender_id IS NOT NULL AND project_id IS NULL;

-- Update existing 'tender' status projects to 'lead'
UPDATE public.projects SET status = 'lead' WHERE status = 'tender';
