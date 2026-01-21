-- Add tender_id column to file_attachments for tender files
ALTER TABLE public.file_attachments 
ADD COLUMN tender_id UUID REFERENCES public.tenders(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_file_attachments_tender_id ON public.file_attachments(tender_id);

-- Update RLS policy for tender files viewing
CREATE POLICY "Users can view files on their tenders" 
ON public.file_attachments 
FOR SELECT 
USING (
  (tender_id IS NOT NULL) AND 
  (
    is_admin_or_manager(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM tender_team_access 
      WHERE tender_id = file_attachments.tender_id 
      AND user_id = auth.uid()
    )
  )
);