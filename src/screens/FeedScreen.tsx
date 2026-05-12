import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getSocialFeed, toggleLike, deleteCheckin } from "../api/checkins";
import { SocialCheckin } from "../types/database";
import { FeedStackParamList } from "../navigation/types";
import { useAuth } from "../context/AuthContext";

type Props = NativeStackScreenProps<FeedStackParamList, "Feed">;
type FeedTab = "global" | "mine";

export default function FeedScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<FeedTab>("global");
  const [checkins, setCheckins] = useState<SocialCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const currentTab = useRef(tab);
  currentTab.current = tab;

  useFocusEffect(
    useCallback(() => {
      loadInitial(tab);
    }, [tab])
  );

  async function loadInitial(feedTab: FeedTab) {
    setLoading(true);
    try {
      const data = await getSocialFeed(20, undefined, feedTab === "mine" ? user?.id : undefined);
      if (currentTab.current === feedTab) {
        setCheckins(data);
        setHasMore(data.length === 20);
      }
    } catch (e: unknown) {
      Alert.alert("Could not load feed", (e as Error).message);
    } finally {
      if (currentTab.current === feedTab) setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      const data = await getSocialFeed(20, undefined, tab === "mine" ? user?.id : undefined);
      setCheckins(data);
      setHasMore(data.length === 20);
    } finally {
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (!hasMore || loadingMore || checkins.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = checkins[checkins.length - 1].created_at;
      const data = await getSocialFeed(20, oldest, tab === "mine" ? user?.id : undefined);
      setCheckins((prev) => [...prev, ...data]);
      setHasMore(data.length === 20);
    } finally {
      setLoadingMore(false);
    }
  }

  function handleLike(checkinId: string) {
    const checkin = checkins.find((c) => c.id === checkinId);
    if (!checkin) return;
    const wasLiked = checkin.user_has_liked;

    // Optimistic update
    setCheckins((prev) =>
      prev.map((c) =>
        c.id === checkinId
          ? { ...c, user_has_liked: !wasLiked, like_count: c.like_count + (wasLiked ? -1 : 1) }
          : c
      )
    );

    toggleLike(checkinId, wasLiked).catch(() => {
      // Revert on failure
      setCheckins((prev) =>
        prev.map((c) =>
          c.id === checkinId
            ? { ...c, user_has_liked: wasLiked, like_count: c.like_count + (wasLiked ? 1 : -1) }
            : c
        )
      );
    });
  }

  function handleEdit(checkin: SocialCheckin) {
    navigation.navigate("CheckIn", {
      whisky: checkin.whisky,
      existingCheckin: checkin,
    });
  }

  function handleDelete(checkin: SocialCheckin) {
    Alert.alert(
      "Delete Check-in",
      `Remove your check-in for ${checkin.whisky.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCheckin(checkin.id);
              setCheckins((prev) => prev.filter((c) => c.id !== checkin.id));
            } catch (e: unknown) {
              Alert.alert("Error", (e as Error).message);
            }
          },
        },
      ]
    );
  }

  const tabs = (
    <View style={styles.tabs}>
      {(["global", "mine"] as FeedTab[]).map((t) => (
        <TouchableOpacity
          key={t}
          style={[styles.tab, tab === t && styles.tabActive]}
          onPress={() => setTab(t)}
        >
          <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
            {t === "global" ? "Everyone" : "My Drams"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {tabs}
        <View style={styles.centered}>
          <ActivityIndicator color="#C8963E" size="large" />
        </View>
      </View>
    );
  }

  if (checkins.length === 0) {
    return (
      <View style={styles.container}>
        {tabs}
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🥃</Text>
          <Text style={styles.emptyTitle}>No drams logged yet</Text>
          <Text style={styles.emptyHint}>Search for a whisky to get started</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.getParent()?.navigate("Search")}
          >
            <Text style={styles.emptyButtonText}>Find a whisky</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {tabs}
      <FlatList
        style={styles.list}
        data={checkins}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CheckinCard
            checkin={item}
            showAuthor={tab === "global"}
            isOwn={item.user_id === user?.id}
            onPress={() => navigation.navigate("WhiskyDetail", { whiskyId: item.whisky_id })}
            onLike={() => handleLike(item.id)}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C8963E" />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color="#C8963E" style={styles.moreLoader} /> : null
        }
      />
    </View>
  );
}

function CheckinCard({
  checkin,
  showAuthor,
  isOwn,
  onPress,
  onLike,
  onEdit,
  onDelete,
}: {
  checkin: SocialCheckin;
  showAuthor: boolean;
  isOwn: boolean;
  onPress: () => void;
  onLike: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const w = checkin.whisky;

  function showOptions() {
    Alert.alert(checkin.whisky.name, undefined, [
      { text: "Edit Check-in", onPress: onEdit },
      { text: "Delete Check-in", style: "destructive", onPress: onDelete },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardLeft}>
        {w.image_url ? (
          <Image source={{ uri: w.image_url }} style={styles.thumb} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Text style={styles.thumbEmoji}>🥃</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        {showAuthor && checkin.profile?.display_name ? (
          <Text style={styles.cardAuthor} numberOfLines={1}>
            {checkin.profile.display_name}
          </Text>
        ) : null}
        <Text style={styles.cardName} numberOfLines={1}>{w.name}</Text>
        <Text style={styles.cardDistillery} numberOfLines={1}>{w.distillery}</Text>
        <View style={styles.cardMeta}>
          {checkin.rating !== null && (
            <Text style={styles.cardRating}>{checkin.rating.toFixed(1)}</Text>
          )}
          {checkin.serving_style && (
            <Text style={styles.cardServing}>{checkin.serving_style}</Text>
          )}
        </View>
        {checkin.notes ? (
          <Text style={styles.cardNotes} numberOfLines={2}>{checkin.notes}</Text>
        ) : null}
        <TouchableOpacity style={styles.likeRow} onPress={onLike} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Text style={styles.likeIcon}>{checkin.user_has_liked ? "❤️" : "🤍"}</Text>
          {checkin.like_count > 0 && (
            <Text style={styles.likeCount}>{checkin.like_count}</Text>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardDate}>
          {new Date(checkin.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </Text>
        {isOwn && (
          <TouchableOpacity
            onPress={showOptions}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={styles.optionsBtn}
          >
            <Text style={styles.optionsBtnText}>•••</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  list: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#1A0E00", marginBottom: 8 },
  emptyHint: { color: "#7A5C3E", fontSize: 15, textAlign: "center", marginBottom: 28 },
  emptyButton: {
    backgroundColor: "#C8963E",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  emptyButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  moreLoader: { padding: 20 },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8DDD0",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#C8963E" },
  tabText: { fontSize: 15, fontWeight: "600", color: "#B8A090" },
  tabTextActive: { color: "#C8963E" },

  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8DDD0",
    shadowColor: "#1A0E00",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: { marginRight: 14 },
  thumb: { width: 60, height: 60, borderRadius: 10 },
  thumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#F5EFE6",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbEmoji: { fontSize: 28 },
  cardBody: { flex: 1 },
  cardAuthor: { fontSize: 12, fontWeight: "600", color: "#C8963E", marginBottom: 2 },
  cardName: { fontSize: 16, fontWeight: "700", color: "#1A0E00", marginBottom: 2 },
  cardDistillery: { fontSize: 13, color: "#7A5C3E", marginBottom: 6 },
  cardMeta: { flexDirection: "row", gap: 8, marginBottom: 4 },
  cardRating: { fontSize: 15, fontWeight: "800", color: "#C8963E" },
  cardServing: {
    fontSize: 12,
    color: "#7A5C3E",
    backgroundColor: "#F5EFE6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  cardNotes: { fontSize: 13, color: "#7A5C3E", marginBottom: 6 },
  likeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  likeIcon: { fontSize: 24 },
  likeCount: { fontSize: 13, color: "#B8A090", fontWeight: "600" },
  cardRight: { alignItems: "flex-end", justifyContent: "space-between" },
  cardDate: { fontSize: 12, color: "#B8A090" },
  optionsBtn: { marginTop: 8 },
  optionsBtnText: { fontSize: 16, color: "#B8A090", letterSpacing: 1 },
});
