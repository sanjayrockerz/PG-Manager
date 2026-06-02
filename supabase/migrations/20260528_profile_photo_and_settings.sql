-- Profile photo support and settings extension

-- Add photo_url to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Storage bucket for profile photos
-- Run via Supabase Dashboard > Storage > New bucket, or use storage API:
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload/update their own photo
DROP POLICY IF EXISTS profile_photos_owner_upload ON storage.objects;
CREATE POLICY profile_photos_owner_upload ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS profile_photos_owner_update ON storage.objects;
CREATE POLICY profile_photos_owner_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Anyone can read (public bucket for avatar display)
DROP POLICY IF EXISTS profile_photos_public_select ON storage.objects;
CREATE POLICY profile_photos_public_select ON storage.objects
FOR SELECT USING (bucket_id = 'profile-photos');

-- Owner can delete their own photos
DROP POLICY IF EXISTS profile_photos_owner_delete ON storage.objects;
CREATE POLICY profile_photos_owner_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
