
ALTER TABLE projects ADD COLUMN IF NOT EXISTS parent_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_projects_parent_project_id ON projects(parent_project_id);
