-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- Public display names, kept in sync with auth.users via trigger.

CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles:select"
  ON profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "profiles:update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles:insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Sync display_name from auth.users metadata on insert or update
CREATE OR REPLACE FUNCTION sync_profile_display_name()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      profiles.display_name
    );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_upserted
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_profile_display_name();

-- Backfill existing users
INSERT INTO public.profiles (id, display_name)
SELECT
  id,
  COALESCE(
    raw_user_meta_data->>'display_name',
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name'
  )
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ─── Likes ────────────────────────────────────────────────────────────────────

CREATE TABLE likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, checkin_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_likes_checkin ON likes(checkin_id);
CREATE INDEX idx_likes_user    ON likes(user_id);

CREATE POLICY "likes:select"
  ON likes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "likes:insert"
  ON likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "likes:delete"
  ON likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());
