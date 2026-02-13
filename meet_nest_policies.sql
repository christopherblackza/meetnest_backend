-- Enable RLS on the bucket (policies are needed for access)
-- Note: These policies allow public access because the backend currently uses the ANON key.
-- For better security, the backend should use the SERVICE_ROLE_KEY, which bypasses RLS.

-- Policy for SELECT (Public Read)
-- Allows anyone to view images in the client-images bucket
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'client-images' );

-- Policy for INSERT (Public Upload)
-- Allows anyone (including the backend using anon key) to upload to client-images
CREATE POLICY "Public Upload Access"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'client-images' );

-- Policy for DELETE (Public Delete)
-- Allows anyone (including the backend using anon key) to delete from client-images
CREATE POLICY "Public Delete Access"
ON storage.objects FOR DELETE
USING ( bucket_id = 'client-images' );

-- Policy for UPDATE (Public Update)
-- Allows anyone (including the backend using anon key) to update in client-images
CREATE POLICY "Public Update Access"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'client-images' );
