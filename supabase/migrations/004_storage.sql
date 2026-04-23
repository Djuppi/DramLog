-- ─── whisky-images storage bucket ───────────────────────────────────────────
-- Public bucket — processed bottle images are not sensitive.
-- Writes go through the remove-background edge function (service_role).

INSERT INTO storage.buckets (id, name, public)
VALUES ('whisky-images', 'whisky-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "whisky-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'whisky-images');

-- Service role bypasses RLS for the edge function upload.
-- Authenticated users can upload directly only if they have a valid path.
CREATE POLICY "whisky-images: authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'whisky-images');
