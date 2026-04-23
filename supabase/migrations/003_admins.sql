-- ─── Admins table ─────────────────────────────────────────────────────────────
-- Populated manually via Supabase dashboard SQL editor:
--   INSERT INTO admins (user_id) VALUES ('<your-auth-user-uuid>');

CREATE TABLE admins (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS policies — table is never queried directly by clients.
-- Access is only through the SECURITY DEFINER function below.
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- ─── is_admin() ───────────────────────────────────────────────────────────────
-- SECURITY DEFINER: runs as the function owner (postgres), bypasses RLS.
-- Safe to call from any authenticated client — returns true/false only.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  );
$$;

-- ─── Whisky policies for admins ───────────────────────────────────────────────
-- Multiple policies on the same table/action are OR'd by Postgres,
-- so this extends (not replaces) the existing whiskies:update_own policy.

CREATE POLICY "whiskies:update_admin" ON whiskies
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "whiskies:delete_admin" ON whiskies
  FOR DELETE TO authenticated
  USING (is_admin());
