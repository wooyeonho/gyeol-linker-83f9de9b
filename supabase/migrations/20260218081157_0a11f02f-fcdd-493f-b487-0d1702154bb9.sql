
-- Create storage bucket for skin previews
INSERT INTO storage.buckets (id, name, public) VALUES ('skin-previews', 'skin-previews', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read skin preview images
CREATE POLICY "Public read skin previews" ON storage.objects
FOR SELECT USING (bucket_id = 'skin-previews');

-- Allow authenticated users to upload skin previews
CREATE POLICY "Authenticated users can upload skin previews" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'skin-previews' AND auth.role() = 'authenticated');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own skin previews" ON storage.objects
FOR DELETE USING (bucket_id = 'skin-previews' AND auth.uid()::text = (storage.foldername(name))[1]);
