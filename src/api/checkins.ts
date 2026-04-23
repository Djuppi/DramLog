import { supabase } from "../lib/supabase";
import type { Checkin, CheckinInput, CheckinWithWhisky } from "../types/database";

const CHECKIN_WITH_WHISKY_QUERY = `
  *,
  whisky:whisky_id (id, name, distillery, image_url, age, abv)
` as const;

export async function createCheckin(input: CheckinInput): Promise<Checkin> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("checkins")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCheckin(
  id: string,
  input: Partial<Omit<CheckinInput, "whisky_id">>
): Promise<Checkin> {
  const { data, error } = await supabase
    .from("checkins")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCheckin(id: string): Promise<void> {
  const { error } = await supabase.from("checkins").delete().eq("id", id);
  if (error) throw error;
}

export async function getMyCheckins(
  limit = 20,
  before?: string
): Promise<CheckinWithWhisky[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("checkins")
    .select(CHECKIN_WITH_WHISKY_QUERY)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CheckinWithWhisky[];
}

export async function getWhiskyCheckins(
  whiskyId: string,
  limit = 20
): Promise<CheckinWithWhisky[]> {
  const { data, error } = await supabase
    .from("checkins")
    .select(CHECKIN_WITH_WHISKY_QUERY)
    .eq("whisky_id", whiskyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as CheckinWithWhisky[];
}

export async function hasTriedWhisky(whiskyId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { count } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("whisky_id", whiskyId)
    .eq("user_id", user.id);

  return (count ?? 0) > 0;
}

export async function getMyStats(): Promise<{
  totalCheckins: number;
  uniqueWhiskies: number;
  avgRating: number | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { totalCheckins: 0, uniqueWhiskies: 0, avgRating: null };

  const { data, error } = await supabase
    .from("checkins")
    .select("whisky_id, rating")
    .eq("user_id", user.id);

  if (error) throw error;
  const rows = data ?? [];

  const uniqueWhiskies = new Set(rows.map((r) => r.whisky_id)).size;
  const ratings = rows.map((r) => r.rating).filter((r) => r !== null) as number[];
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null;

  return {
    totalCheckins: rows.length,
    uniqueWhiskies,
    avgRating: avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
  };
}
