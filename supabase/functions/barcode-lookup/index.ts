import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WhiskyCandidate {
  name: string;
  distillery: string;
  region?: string;
  country?: string;
  age?: number;
  abv?: number;
  image_url?: string;
  source: string;
  source_id?: string;
}

interface LookupResponse {
  found: boolean;
  barcode: string;
  whisky?: Record<string, unknown>;
  source?: string;
  needs_manual_entry?: boolean;
}

// ─── Slug normalization ───────────────────────────────────────────────────────

function generateSlug(name: string, distillery: string, age?: number): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  const agePart = age ? `__${age}yr` : "__nas";
  return `${norm(distillery)}__${norm(name)}${agePart}`;
}

// ─── EAN-13 check digit validation ───────────────────────────────────────────

function isValidEan(barcode: string): boolean {
  if (!/^\d{8}$|^\d{12,13}$/.test(barcode)) return false;
  if (barcode.length !== 13 && barcode.length !== 12) return true; // UPC-E / Code128 — skip check
  const digits = barcode.padStart(13, "0").split("").map(Number);
  const check = digits.slice(0, 12).reduce(
    (sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3),
    0
  );
  return (10 - (check % 10)) % 10 === digits[12];
}

// ─── External API adapters ────────────────────────────────────────────────────

async function lookupOpenFoodFacts(barcode: string): Promise<WhiskyCandidate | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      {
        headers: { "User-Agent": "DramLog/1.0 (contact@example.com)" },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1) return null;

    const p = data.product;
    const cats: string = (p.categories_tags ?? []).join(" ");
    const isSpirit =
      cats.includes("spirits") ||
      cats.includes("whisky") ||
      cats.includes("whiskey") ||
      cats.includes("scotch") ||
      cats.includes("bourbon");
    if (!isSpirit) return null;

    const name = p.product_name_en || p.product_name;
    if (!name) return null;

    return {
      name,
      distillery: p.brands ?? "Unknown",
      country: p.countries_tags?.[0]?.replace("en:", "") ?? undefined,
      abv: p.nutriments?.alcohol ? parseFloat(p.nutriments.alcohol) : undefined,
      image_url: p.image_front_url ?? p.image_url ?? undefined,
      source: "open_food_facts",
      source_id: barcode,
    };
  } catch {
    return null;
  }
}

async function lookupUpcItemDb(barcode: string): Promise<WhiskyCandidate | null> {
  // Free tier: 100 req/day. Set UPCITEMDB_KEY env var for paid tier.
  const key = Deno.env.get("UPCITEMDB_KEY");
  const url = key
    ? `https://api.upcitemdb.com/prod/v1/lookup?upc=${barcode}`
    : `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;

  try {
    const res = await fetch(url, {
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;

    const category: string = (item.category ?? "").toLowerCase();
    const title: string = (item.title ?? "").toLowerCase();
    const isSpirit =
      category.includes("spirit") ||
      category.includes("whisky") ||
      category.includes("whiskey") ||
      category.includes("liquor") ||
      category.includes("wine & spirits") ||
      title.includes("whisky") ||
      title.includes("whiskey") ||
      title.includes("scotch") ||
      title.includes("bourbon");

    if (!isSpirit) return null;

    return {
      name: item.title,
      distillery: item.brand ?? "Unknown",
      image_url: item.images?.[0] ?? undefined,
      source: "upcitemdb",
      source_id: item.ean ?? barcode,
    };
  } catch {
    return null;
  }
}

const LOOKUP_CHAIN: Array<(b: string) => Promise<WhiskyCandidate | null>> = [
  lookupOpenFoodFacts,
  lookupUpcItemDb,
];

// ─── Deduplication ────────────────────────────────────────────────────────────

async function findOrCreateWhisky(
  admin: SupabaseClient,
  candidate: WhiskyCandidate
): Promise<Record<string, unknown>> {
  const slug = generateSlug(candidate.name, candidate.distillery, candidate.age);

  // 1. Exact slug
  const { data: bySlug } = await admin
    .from("whiskies")
    .select("*")
    .eq("slug", slug)
    .is("canonical_id", null)
    .maybeSingle();
  if (bySlug) return bySlug;

  // 2. Same external source record
  if (candidate.source_id) {
    const { data: bySource } = await admin
      .from("whiskies")
      .select("*")
      .eq("source", candidate.source)
      .eq("source_id", candidate.source_id)
      .maybeSingle();
    if (bySource) return bySource;
  }

  // 3. Fuzzy match via pg_trgm RPC (threshold 0.7)
  const { data: fuzzyRows } = await admin.rpc("find_similar_whisky", {
    p_name: candidate.name,
    p_distillery: candidate.distillery,
    p_threshold: 0.7,
  });
  if (fuzzyRows && fuzzyRows.length > 0) return fuzzyRows[0];

  // 4. Insert new whisky (no created_by — sourced from external API)
  const { data: created, error } = await admin
    .from("whiskies")
    .insert({ ...candidate, slug })
    .select()
    .single();

  if (error) throw new Error(`whisky insert failed: ${error.message}`);
  return created;
}

// ─── CORS helpers ─────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResp = (body: LookupResponse, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const errorResp = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }
  if (req.method !== "POST") return errorResp(405, "Method not allowed");

  // Verify JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return errorResp(401, "Missing Authorization");

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return errorResp(401, "Invalid token");

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: { barcode?: string; barcode_format?: string };
  try {
    body = await req.json();
  } catch {
    return errorResp(400, "Invalid JSON body");
  }

  const { barcode, barcode_format = "EAN13" } = body;
  if (!barcode || typeof barcode !== "string") return errorResp(400, "barcode required");

  // Basic EAN validation client-side too, but double-check server-side
  if (!isValidEan(barcode)) return errorResp(400, "Invalid barcode checksum");

  // ── 1. DB cache ────────────────────────────────────────────────────────────
  const { data: cached } = await adminClient
    .from("barcodes")
    .select("*, whisky:whisky_id(*)")
    .eq("barcode", barcode)
    .maybeSingle();

  if (cached) {
    if (cached.whisky_id && cached.whisky) {
      return jsonResp({ found: true, barcode, whisky: cached.whisky, source: "cache" });
    }
    if (cached.lookup_exhausted === true) {
      return jsonResp({ found: false, barcode, needs_manual_entry: true });
    }
  }

  // ── 2. External lookup chain ───────────────────────────────────────────────
  let candidate: WhiskyCandidate | null = null;
  for (const lookup of LOOKUP_CHAIN) {
    candidate = await lookup(barcode);
    if (candidate) break;
  }

  if (!candidate) {
    await adminClient.from("barcodes").upsert(
      { barcode, barcode_format, lookup_exhausted: true, lookup_attempted_at: new Date().toISOString() },
      { onConflict: "barcode" }
    );
    return jsonResp({ found: false, barcode, needs_manual_entry: true });
  }

  // ── 3. Dedup / insert whisky ───────────────────────────────────────────────
  let whisky: Record<string, unknown>;
  try {
    whisky = await findOrCreateWhisky(adminClient, candidate);
  } catch (e) {
    return errorResp(500, (e as Error).message);
  }

  // ── 4. Cache mapping ───────────────────────────────────────────────────────
  await adminClient.from("barcodes").upsert(
    {
      barcode,
      barcode_format,
      whisky_id: whisky.id,
      lookup_exhausted: false,
      lookup_attempted_at: new Date().toISOString(),
    },
    { onConflict: "barcode" }
  );

  return jsonResp({ found: true, barcode, whisky, source: candidate.source });
});
