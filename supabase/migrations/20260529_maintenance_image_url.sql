-- Add image_url column to maintenance_tickets for tenant photo attachments
ALTER TABLE maintenance_tickets
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

-- Ensure maintenance-images storage bucket exists and is publicly readable
INSERT INTO storage.buckets (id, name, public)
  VALUES ('maintenance-images', 'maintenance-images', true)
  ON CONFLICT (id) DO NOTHING;

-- RLS: tenants can insert to maintenance-images bucket (their own folder)
-- Note: PostgreSQL does NOT support CREATE POLICY IF NOT EXISTS — use DROP + CREATE
DROP POLICY IF EXISTS "Tenants can upload maintenance images" ON storage.objects;
CREATE POLICY "Tenants can upload maintenance images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'maintenance-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: publicly readable so owners can view attached photos
DROP POLICY IF EXISTS "Public read maintenance images" ON storage.objects;
CREATE POLICY "Public read maintenance images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'maintenance-images');

-- RLS: owners/tenants can delete their own uploads
DROP POLICY IF EXISTS "Owner delete maintenance images" ON storage.objects;
CREATE POLICY "Owner delete maintenance images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'maintenance-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
