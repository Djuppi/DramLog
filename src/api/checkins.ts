import { supabase } from "../lib/supabase";
import type { Checkin, CheckinInput, CheckinWithWhisky, SocialCheckin } from "../types/database";

const CHECKIN_WITH_WHISKY_QUERY = `
  *,
  whisky:whisky_id (id, name, distillery, image_url, age, abv)
` as const;

const SOCIAL_CHECKIN_QUERY = `
  *,
  whisky:whisky_id (id, name, distillery, image_url, age, abv),
  likes (count)
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

export async function getSocialFeed(
  limit = 20,
  before?: string,
  filterUserId?: string
): Promise<SocialCheckin[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("checkins")
    .select(SOCIAL_CHECKIN_QUERY)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filterUserId) query = query.eq("user_id", filterUserId);
  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const checkinIds = rows.map((r: any) => r.id as string);
  const userIds = [...new Set(rows.map((r: any) => r.user_id as string))];

  // Fetch profiles and current user's likes in parallel
  const [profilesResult, myLikesResult] = await Promise.all([
    supabase.from("profiles").select("id, display_name").in("id", userIds),
    supabase.from("likes").select("checkin_id").eq("user_id", user.id).in("checkin_id", checkinIds),
  ]);

  const profileMap = new Map(
    (profilesResult.data ?? []).map((p: any) => [p.id as string, p.display_name as string | null])
  );
  const likedSet = new Set((myLikesResult.data ?? []).map((l: any) => l.checkin_id as string));

  return rows.map((row: any) => ({
    ...row,
    profile: { display_name: profileMap.get(row.user_id) ?? null },
    like_count: Number(row.likes?.[0]?.count ?? 0),
    user_has_liked: likedSet.has(row.id),
  })) as SocialCheckin[];
}

export async function toggleLike(checkinId: string, currentlyLiked: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (currentlyLiked) {
    const { error } = await supabase.from("likes")
      .delete()
      .eq("checkin_id", checkinId)
      .eq("user_id", user.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("likes")
      .insert({ checkin_id: checkinId, user_id: user.id });
    if (error) throw error;
  }
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
