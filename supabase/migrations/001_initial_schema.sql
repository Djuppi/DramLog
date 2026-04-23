-- Extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- unaccent() is STABLE by default, which is not allowed in a generated column
-- expression (requires IMMUTABLE). This wrapper re-declares it as IMMUTABLE,
-- which is safe because unaccent's output depends only on its input and the
-- loaded unaccent dictionary (treated as a constant after install).
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$
  SELECT unaccent($1);
$$;

-- ─── Whiskies ────────────────────────────────────────────────────────────────

CREATE TABLE whiskies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  distillery   TEXT NOT NULL,
  region       TEXT,
  country      TEXT,
  age          SMALLINT CHECK (age > 0 AND age < 100),
  abv          NUMERIC(5,2) CHECK (abv > 0 AND abv <= 100),
  image_url    TEXT,
  slug         TEXT UNIQUE NOT NULL,
  source       TEXT NOT NULL DEFAULT 'user',
  source_id    TEXT,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  canonical_id UUID,  -- FK added after table exists (self-reference)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english',
      immutable_unaccent(coalesce(name, '')) || ' ' ||
      immutable_unaccent(coalesce(distillery, '')) || ' ' ||
      coalesce(region, '') || ' ' ||
      coalesce(country, '')
    )
  ) STORED
);

ALTER TABLE whiskies
  ADD CONSTRAINT whiskies_canonical_id_fkey
  FOREIGN KEY (canonical_id) REFERENCES whiskies(id) ON DELETE SET NULL;

CREATE INDEX idx_whiskies_slug      ON whiskies(slug);
CREATE INDEX idx_whiskies_source    ON whiskies(source, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX idx_whiskies_fts       ON whiskies USING GIN(search_vector);
CREATE INDEX idx_whiskies_name_trgm ON whiskies USING GIN(name gin_trgm_ops);
CREATE INDEX idx_whiskies_canonical ON whiskies(canonical_id) WHERE canonical_id IS NOT NULL;

-- ─── Barcodes ─────────────────────────────────────────────────────────────────

CREATE TABLE barcodes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode             TEXT NOT NULL UNIQUE,
  barcode_format      TEXT NOT NULL DEFAULT 'EAN13',
  whisky_id           UUID REFERENCES whiskies(id) ON DELETE SET NULL,
  lookup_exhausted    BOOLEAN,
  lookup_attempted_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_barcodes_whisky ON barcodes(whisky_id) WHERE whisky_id IS NOT NULL;

-- ─── Check-ins ────────────────────────────────────────────────────────────────

CREATE TABLE checkins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whisky_id     UUID NOT NULL REFERENCES whiskies(id),
  rating        NUMERIC(3,1) CHECK (rating >= 0 AND rating <= 10),
  notes         TEXT CHECK (char_length(notes) <= 2000),
  serving_style TEXT CHECK (serving_style IN ('neat', 'rocks', 'water', 'cocktail', 'other')),
  venue         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkins_user        ON checkins(user_id);
CREATE INDEX idx_checkins_whisky      ON checkins(whisky_id);
CREATE INDEX idx_checkins_created     ON checkins(created_at DESC);
CREATE INDEX idx_checkins_user_whisky ON checkins(user_id, whisky_id);

-- ─── Whisky merge log ─────────────────────────────────────────────────────────

CREATE TABLE whisky_merge_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kept_id    UUID NOT NULL REFERENCES whiskies(id),
  merged_id  UUID NOT NULL REFERENCES whiskies(id),
  merged_by  UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Stats view ───────────────────────────────────────────────────────────────

CREATE VIEW whisky_stats AS
SELECT
  whisky_id,
  COUNT(*)                                    AS checkin_count,
  ROUND(AVG(rating)::NUMERIC, 2)             AS avg_rating,
  COUNT(*) FILTER (WHERE rating IS NOT NULL) AS rated_count,
  COUNT(DISTINCT user_id)                    AS unique_tasters
FROM checkins
GROUP BY whisky_id;

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER whiskies_updated_at
  BEFORE UPDATE ON whiskies
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER checkins_updated_at
  BEFORE UPDATE ON checkins
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─── Fuzzy whisky finder (used by edge function) ──────────────────────────────

CREATE OR REPLACE FUNCTION find_similar_whisky(
  p_name        TEXT,
  p_distillery  TEXT,
  p_threshold   FLOAT DEFAULT 0.7
)
RETURNS SETOF whiskies
LANGUAGE SQL STABLE AS $$
  SELECT *
  FROM whiskies
  WHERE canonical_id IS NULL
    AND similarity(name, p_name) > p_threshold
    AND similarity(distillery, p_distillery) > p_threshold
  ORDER BY similarity(name, p_name) + similarity(distillery, p_distillery) DESC
  LIMIT 1;
$$;
