
-- Batch 2: Locked rows, baseline snapshots, attachments

-- Add lock/approval columns to media_plan_items
ALTER TABLE media_plan_items ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE media_plan_items ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE media_plan_items ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);

-- Add notes to media_plans (plan-level)
ALTER TABLE media_plans ADD COLUMN IF NOT EXISTS notes TEXT;

-- Baseline snapshots
CREATE TABLE IF NOT EXISTS media_plan_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_plan_id UUID REFERENCES media_plans(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Baseline',
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

ALTER TABLE media_plan_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage snapshots for their company plans"
  ON media_plan_snapshots FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM media_plans mp
      JOIN projects p ON p.id = mp.project_id
      JOIN user_company_roles ucr ON ucr.company_id = p.company_id
      WHERE mp.id = media_plan_snapshots.media_plan_id
      AND ucr.user_id = auth.uid()
      AND ucr.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM media_plans mp
      JOIN projects p ON p.id = mp.project_id
      JOIN user_company_roles ucr ON ucr.company_id = p.company_id
      WHERE mp.id = media_plan_snapshots.media_plan_id
      AND ucr.user_id = auth.uid()
      AND ucr.status = 'active'
    )
  );

-- Attachments per action
CREATE TABLE IF NOT EXISTS media_plan_item_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_plan_item_id UUID REFERENCES media_plan_items(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE media_plan_item_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage attachments for their company plans"
  ON media_plan_item_attachments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM media_plan_items mpi
      JOIN media_plans mp ON mp.id = mpi.media_plan_id
      JOIN projects p ON p.id = mp.project_id
      JOIN user_company_roles ucr ON ucr.company_id = p.company_id
      WHERE mpi.id = media_plan_item_attachments.media_plan_item_id
      AND ucr.user_id = auth.uid()
      AND ucr.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM media_plan_items mpi
      JOIN media_plans mp ON mp.id = mpi.media_plan_id
      JOIN projects p ON p.id = mp.project_id
      JOIN user_company_roles ucr ON ucr.company_id = p.company_id
      WHERE mpi.id = media_plan_item_attachments.media_plan_item_id
      AND ucr.user_id = auth.uid()
      AND ucr.status = 'active'
    )
  );
