-- ─── Enable RLS ───────────────────────────────────────────────────────────────

ALTER TABLE whiskies ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcodes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins  ENABLE ROW LEVEL SECURITY;

-- ─── Whiskies ─────────────────────────────────────────────────────────────────
-- Community-owned: all authenticated users can read.
-- Authenticated users can insert (created_by = caller).
-- Only creator can update their own submissions.
-- Writes from edge functions use service_role (bypasses RLS).

CREATE POLICY "whiskies:select"
  ON whiskies FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "whiskies:insert"
  ON whiskies FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "whiskies:update_own"
  ON whiskies FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ─── Barcodes ─────────────────────────────────────────────────────────────────
-- Read-only for clients. Writes go through the edge function (service_role).

CREATE POLICY "barcodes:select"
  ON barcodes FOR SELECT TO authenticated
  USING (true);

-- ─── Check-ins ────────────────────────────────────────────────────────────────
-- Public read (social feed). User-scoped writes.

CREATE POLICY "checkins:select_all"
  ON checkins FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "checkins:insert"
  ON checkins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "checkins:update"
  ON checkins FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "checkins:delete"
  ON checkins FOR DELETE TO authenticated
  USING (user_id = auth.uid());
