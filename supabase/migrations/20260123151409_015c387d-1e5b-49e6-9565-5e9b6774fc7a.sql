-- Drop the existing restrictive upload policy
DROP POLICY IF EXISTS "Active users can upload project files" ON storage.objects;

-- Create a more permissive upload policy that allows non-deactivated users
CREATE POLICY "Authenticated users can upload project files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'project-files'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND status IN ('suspended', 'deactivated')
  )
);