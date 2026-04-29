import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function err(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const PROMPT = `You are analyzing a whisky bottle label. Extract the following information and return ONLY a JSON object with these fields (omit any field you cannot determine with confidence):
- name: the whisky expression name (e.g. "12 Year Old", "Double Wood", "Cask Strength")
- distillery: the distillery name (e.g. "Glenfiddich", "Laphroaig")
- region: whisky region (e.g. "Speyside", "Islay", "Highland", "Lowland", "Campbeltown")
- country: country of origin (e.g. "Scotland", "Ireland", "Japan", "USA")
- age: age in years as a number (only if an age statement is clearly visible on the label)
- abv: alcohol by volume as a number without the % sign (e.g. 43.0)
- bottle_size: bottle volume in millilitres as a number (e.g. 700, 750, 1000)

Return ONLY the JSON object, no explanation, no markdown code fences.`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return err(405, "Method not allowed");

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return err(401, "Missing Authorization");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return err(401, "Unauthorized");

  let imageBase64: string;
  try {
    const body = await req.json();
    imageBase64 = body?.imageBase64;
  } catch {
    return err(400, "Invalid JSON");
  }
  if (!imageBase64) return err(400, "imageBase64 is required");

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) return err(500, "ANTHROPIC_API_KEY not configured");

  let claudeText: string;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
              },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(`Claude API ${response.status}: ${body?.error?.message ?? response.statusText}`);
    }

    const result = await response.json();
    claudeText = result.content?.[0]?.text ?? "";
  } catch (e) {
    return err(502, (e as Error).message);
  }

  // Strip optional markdown code fences Claude may add despite instructions
  const cleaned = claudeText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let identified: Record<string, unknown>;
  try {
    identified = JSON.parse(cleaned);
  } catch {
    return err(502, "Could not parse label data from response");
  }

  return new Response(JSON.stringify(identified), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
