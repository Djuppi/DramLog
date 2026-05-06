import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? ""
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function html(body: string) {
  return new Response(body, {
    headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" },
  });
}

// Fields exposed publicly (omit internal columns)
const PUBLIC_COLUMNS =
  "id,name,distillery,region,country,age,abv,bottle_size,image_url,slug,created_at";

// ── Route handlers ────────────────────────────────────────────────────────────

async function listWhiskies(params: URLSearchParams) {
  const q = params.get("q")?.trim() ?? "";
  const country = params.get("country")?.trim() ?? "";
  const region = params.get("region")?.trim() ?? "";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "20", 10)));
  const from = (page - 1) * limit;

  let query = supabase
    .from("whiskies")
    .select(PUBLIC_COLUMNS, { count: "exact" })
    .is("canonical_id", null)
    .order("name")
    .range(from, from + limit - 1);

  if (q) query = query.or(`name.ilike.%${q}%,distillery.ilike.%${q}%`);
  if (country) query = query.ilike("country", country);
  if (region) query = query.ilike("region", region);

  const { data, error, count } = await query;
  if (error) return json({ error: error.message }, 500);

  return json({
    data: data ?? [],
    meta: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}

async function getWhiskyById(id: string) {
  const { data, error } = await supabase
    .from("whiskies")
    .select(PUBLIC_COLUMNS)
    .eq("id", id)
    .is("canonical_id", null)
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Not found" }, 404);
  return json(data);
}

// ── Privacy policy page ───────────────────────────────────────────────────────

function privacyPolicy() {
  const baseUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/public-api";

  return html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DramLog — Privacy Policy & Public API</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #1a0e00;
      color: #f5e6d0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 16px;
      line-height: 1.7;
      padding: 48px 24px 80px;
    }
    .wrap { max-width: 720px; margin: 0 auto; }
    h1 { color: #c8963e; font-size: 2rem; margin-bottom: 4px; letter-spacing: 0.5px; }
    .tagline { color: #a0856a; margin-bottom: 48px; font-size: 0.95rem; }
    h2 { color: #c8963e; font-size: 1.15rem; margin: 40px 0 12px; }
    h3 { color: #f5e6d0; font-size: 1rem; margin: 28px 0 8px; }
    p, li { color: #c8b49a; margin-bottom: 10px; }
    ul { padding-left: 20px; }
    a { color: #c8963e; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .divider { border: none; border-top: 1px solid #3a2010; margin: 48px 0; }
    code {
      background: #2a1c0c;
      border: 1px solid #4a3020;
      border-radius: 6px;
      padding: 2px 8px;
      font-size: 0.88rem;
      color: #f5e6d0;
      word-break: break-all;
    }
    pre {
      background: #2a1c0c;
      border: 1px solid #4a3020;
      border-radius: 10px;
      padding: 20px;
      overflow-x: auto;
      margin: 16px 0;
    }
    pre code {
      background: none;
      border: none;
      padding: 0;
      font-size: 0.85rem;
      line-height: 1.6;
    }
    .endpoint {
      background: #2a1c0c;
      border: 1px solid #4a3020;
      border-radius: 10px;
      padding: 20px 24px;
      margin: 16px 0;
    }
    .method {
      display: inline-block;
      background: #c8963e;
      color: #1a0e00;
      font-weight: 700;
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 4px;
      margin-right: 8px;
      vertical-align: middle;
    }
    .path { font-family: monospace; font-size: 0.95rem; }
    .param { margin: 8px 0 0; font-size: 0.9rem; color: #a0856a; }
    .param code { font-size: 0.82rem; }
    footer { color: #4a3020; font-size: 0.85rem; margin-top: 64px; }
  </style>
</head>
<body>
<div class="wrap">

  <h1>DramLog</h1>
  <p class="tagline">Your whisky journey</p>

  <h2>Public Whisky API</h2>
  <p>
    DramLog maintains a community-built database of whiskies. As users add bottles
    the database grows — and it's freely available to query. No API key required.
  </p>
  <p>Base URL: <code>${baseUrl}</code></p>

  <h3>List whiskies</h3>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/whiskies</span>
    <p class="param">Optional query parameters:</p>
    <ul style="margin-top:8px;font-size:0.9rem;color:#a0856a">
      <li><code>q</code> — search name or distillery</li>
      <li><code>country</code> — filter by country (e.g. <code>Scotland</code>)</li>
      <li><code>region</code> — filter by region (e.g. <code>Islay</code>)</li>
      <li><code>page</code> — page number, default <code>1</code></li>
      <li><code>limit</code> — results per page, default <code>20</code>, max <code>100</code></li>
    </ul>
  </div>

  <pre><code>GET ${baseUrl}/whiskies?q=lagavulin&amp;limit=5

{
  "data": [
    {
      "id": "uuid",
      "name": "16 Year Old",
      "distillery": "Lagavulin",
      "region": "Islay",
      "country": "Scotland",
      "age": 16,
      "abv": 43.0,
      "bottle_size": 700,
      "image_url": "https://...",
      "slug": "lagavulin-16-year-old",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 5, "total": 1, "pages": 1 }
}</code></pre>

  <h3>Get a single whisky</h3>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/whiskies/:id</span>
  </div>

  <p style="margin-top:16px;font-size:0.9rem;color:#a0856a">
    The API is free to use. Attribution appreciated but not required.
    If you build something with it, we'd love to hear about it.
  </p>

  <hr class="divider" />

  <h2>Privacy Policy</h2>
  <p><em>Last updated: May 2026</em></p>

  <h3>What we collect</h3>
  <ul>
    <li>Your email address and public profile information when you sign in.</li>
    <li>Whisky check-ins you create: rating, tasting notes, serving style, and venue.</li>
    <li>Photos of whisky bottles you choose to upload.</li>
    <li>Your date of birth, used only to verify you are 18 or older. It is not stored after verification.</li>
  </ul>

  <h3>How we use it</h3>
  <ul>
    <li>To provide the DramLog service and display your check-in history.</li>
    <li>To build a shared, publicly queryable whisky database (bottle data only — check-ins are not public).</li>
    <li>We do not sell your data or use it for advertising.</li>
  </ul>

  <h3>Third-party services</h3>
  <ul>
    <li><strong>Supabase</strong> — database, authentication, and file storage. <a href="https://supabase.com/privacy" target="_blank">Privacy policy</a>.</li>
    <li><strong>remove.bg</strong> — bottle photos may be processed to remove backgrounds. Images are not retained by remove.bg after processing. <a href="https://www.remove.bg/privacy" target="_blank">Privacy policy</a>.</li>
    <li><strong>Anthropic Claude</strong> — bottle label photos may be sent to Claude for whisky identification. Images are not used to train models. <a href="https://www.anthropic.com/privacy" target="_blank">Privacy policy</a>.</li>
  </ul>

  <h3>Data retention</h3>
  <p>
    Your account and associated data are retained as long as your account is active.
    You can request deletion by contacting us.
  </p>

  <h3>Your rights</h3>
  <p>
    You can request a copy of your data or ask us to delete your account at any time
    by emailing <a href="mailto:askeda@gmail.com">askeda@gmail.com</a>.
  </p>

  <h3>Contact</h3>
  <p><a href="mailto:askeda@gmail.com">askeda@gmail.com</a></p>

  <footer>
    <p>DramLog · Community whisky journal</p>
  </footer>

</div>
</body>
</html>`);
}

// ── Router ────────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  // Strip the function prefix so paths are relative (works locally and in production)
  const path = url.pathname.replace(/^\/functions\/v1\/public-api/, "").replace(/\/$/, "") || "/";

  if (path === "/" || path === "/privacy") {
    return privacyPolicy();
  }

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (path === "/whiskies") {
    return listWhiskies(url.searchParams);
  }

  const whiskyMatch = path.match(/^\/whiskies\/([^/]+)$/);
  if (whiskyMatch) {
    return getWhiskyById(whiskyMatch[1]);
  }

  return json({ error: "Not found" }, 404);
});
