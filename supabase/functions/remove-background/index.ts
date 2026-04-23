import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const err = (status: number, message: string) =>
  json({ error: message }, status);

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return err(405, "Method not allowed");

  // Verify caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return err(401, "Missing Authorization");

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return err(401, "Invalid token");

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: { imageBase64?: string };
  try {
    body = await req.json();
  } catch {
    return err(400, "Invalid JSON");
  }

  const { imageBase64 } = body;
  if (!imageBase64) return err(400, "imageBase64 required");

  const removeBgKey = Deno.env.get("REMOVE_BG_API_KEY");
  if (!removeBgKey) return err(500, "REMOVE_BG_API_KEY not configured");

  // Strip data URI prefix if present (data:image/jpeg;base64,...)
  const base64Data = imageBase64.includes(",")
    ? imageBase64.split(",")[1]
    : imageBase64;

  // ── Call remove.bg ─────────────────────────────────────────────────────────
  const form = new FormData();
  form.append("image_file_b64", base64Data);
  form.append("size", "auto");
  form.append("format", "png");
  // type=product works best for bottles on shelves / plain backgrounds
  form.append("type", "product");

  let removeBgRes: Response;
  try {
    removeBgRes = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": removeBgKey },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    return err(502, `remove.bg unreachable: ${(e as Error).message}`);
  }

  if (!removeBgRes.ok) {
    const detail = await removeBgRes.text().catch(() => "");
    return err(502, `remove.bg error ${removeBgRes.status}: ${detail}`);
  }

  const pngBuffer = await removeBgRes.arrayBuffer();

  // ── Upload to Supabase Storage ─────────────────────────────────────────────
  const filename = `bottles/${crypto.randomUUID()}.png`;

  const { error: uploadErr } = await adminClient.storage
    .from("whisky-images")
    .upload(filename, pngBuffer, {
      contentType: "image/png",
      upsert: false,
    });

  if (uploadErr) return err(500, `Storage upload failed: ${uploadErr.message}`);

  const { data: { publicUrl } } = adminClient.storage
    .from("whisky-images")
    .getPublicUrl(filename);

  return json({ url: publicUrl });
});
