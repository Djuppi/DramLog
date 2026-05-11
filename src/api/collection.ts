import { supabase } from "../lib/supabase";
import type { CollectionEntry } from "../types/database";

export interface CollectionWithWhisky extends CollectionEntry {
  whisky: {
    id: string;
    name: string;
    distillery: string;
    image_url: string | null;
    region: string | null;
    country: string | null;
    age: number | null;
    abv: number | null;
  };
}

export async function getMyCollection(): Promise<CollectionWithWhisky[]> {
  const { data, error } = await supabase
    .from("collection")
    .select("*, whisky:whiskies(id, name, distillery, image_url, region, country, age, abv)")
    .order("added_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CollectionWithWhisky[];
}

export async function getCollectionEntry(whiskyId: string): Promise<CollectionEntry | null> {
  const { data, error } = await supabase
    .from("collection")
    .select("*")
    .eq("whisky_id", whiskyId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function addToCollection(whiskyId: string): Promise<CollectionEntry> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("collection")
    .insert({ whisky_id: whiskyId, user_id: user!.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeFromCollection(entryId: string): Promise<void> {
  const { error } = await supabase
    .from("collection")
    .delete()
    .eq("id", entryId);
  if (error) throw error;
}

export async function setOpenedDate(entryId: string, date: Date): Promise<CollectionEntry> {
  const { data, error } = await supabase
    .from("collection")
    .update({ opened_at: date.toISOString() })
    .eq("id", entryId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCollectionCount(): Promise<number> {
  const { count, error } = await supabase
    .from("collection")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}
