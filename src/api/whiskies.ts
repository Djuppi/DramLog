import { supabase } from "../lib/supabase";
import { generateSlug } from "../lib/slug";
import type { Whisky, WhiskyInput, WhiskyWithStats } from "../types/database";

export async function createWhisky(input: WhiskyInput): Promise<Whisky> {
  const { data: { user } } = await supabase.auth.getUser();
  const slug = generateSlug(input.name, input.distillery, input.age);

  const { data, error } = await supabase
    .from("whiskies")
    .insert({ ...input, slug, created_by: user?.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getWhisky(id: string): Promise<WhiskyWithStats | null> {
  const { data, error } = await supabase
    .from("whiskies")
    .select("*, stats:whisky_stats(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as WhiskyWithStats | null;
}

export async function searchWhiskies(query: string, limit = 20): Promise<Whisky[]> {
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await supabase
    .from("whiskies")
    .select("*")
    .or(`name.ilike.%${q}%,distillery.ilike.%${q}%,region.ilike.%${q}%,country.ilike.%${q}%`)
    .is("canonical_id", null)
    .order("name")
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
