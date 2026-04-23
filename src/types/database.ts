// Generated-style types for the DramLog Supabase schema.
// Re-run `supabase gen types typescript` after schema changes to keep in sync.

export type ServingStyle = "neat" | "rocks" | "water" | "cocktail" | "other";

export interface Whisky {
  id: string;
  name: string;
  distillery: string;
  region: string | null;
  country: string | null;
  age: number | null;
  abv: number | null;
  image_url: string | null;
  slug: string;
  source: string;
  source_id: string | null;
  created_by: string | null;
  canonical_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhiskyStats {
  whisky_id: string;
  checkin_count: number;
  avg_rating: number | null;
  rated_count: number;
  unique_tasters: number;
}

export interface WhiskyWithStats extends Whisky {
  stats: WhiskyStats | null;
}

export interface Barcode {
  id: string;
  barcode: string;
  barcode_format: string;
  whisky_id: string | null;
  lookup_exhausted: boolean | null;
  lookup_attempted_at: string | null;
  created_at: string;
}

export interface Checkin {
  id: string;
  user_id: string;
  whisky_id: string;
  rating: number | null;
  notes: string | null;
  serving_style: ServingStyle | null;
  venue: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckinWithWhisky extends Checkin {
  whisky: Pick<Whisky, "id" | "name" | "distillery" | "image_url" | "age" | "abv">;
}

// ─── Input shapes ─────────────────────────────────────────────────────────────

export interface WhiskyInput {
  name: string;
  distillery: string;
  region?: string;
  country?: string;
  age?: number;
  abv?: number;
  image_url?: string;
}

export interface CheckinInput {
  whisky_id: string;
  rating?: number;
  notes?: string;
  serving_style?: ServingStyle;
  venue?: string;
}

// ─── Edge function response ───────────────────────────────────────────────────

export interface BarcodeResult {
  found: boolean;
  barcode: string;
  whisky?: Whisky;
  source?: string;
  needs_manual_entry?: boolean;
}
