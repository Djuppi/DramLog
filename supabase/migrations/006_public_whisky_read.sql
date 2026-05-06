-- Allow unauthenticated (anon) reads on whiskies for the public API.
CREATE POLICY "whiskies:select_anon"
  ON whiskies FOR SELECT TO anon
  USING (true);
