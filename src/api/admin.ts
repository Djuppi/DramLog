import { supabase } from "../lib/supabase";
import { generateSlug } from "../lib/slug";
import type { Whisky, WhiskyInput } from "../types/database";

export async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) return false;
  return data === true;
}

export async function listAllWhiskies(
  search: string,
  limit = 30,
  offset = 0
): Promise<Whisky[]> {
  let query = supabase
    .from("whiskies")
    .select("*")
    .order("distillery", { ascending: true })
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (search.trim()) {
    const q = search.trim();
    query = query.or(
      `name.ilike.%${q}%,distillery.ilike.%${q}%,region.ilike.%${q}%,country.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateWhisky(
  id: string,
  input: Partial<WhiskyInput>
): Promise<Whisky> {
  // Regenerate slug if name, distillery, or age changed
  const updates: Partial<WhiskyInput & { slug: string }> = { ...input };
  if (input.name !== undefined || input.distillery !== undefined || input.age !== undefined) {
    // Fetch current record to fill any missing fields for slug generation
    const { data: current } = await supabase
      .from("whiskies")
      .select("name, distillery, age")
      .eq("id", id)
      .single();

    if (current) {
      updates.slug = generateSlug(
        input.name ?? current.name,
        input.distillery ?? current.distillery,
        input.age !== undefined ? input.age : current.age
      );
    }
  }

  const { data, error } = await supabase
    .from("whiskies")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWhisky(id: string): Promise<void> {
  const { error } = await supabase.from("whiskies").delete().eq("id", id);
  if (error) throw error;
}
