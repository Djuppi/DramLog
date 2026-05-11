import React, { useState, useCallback } from "react";
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
import { getMyCheckins, deleteCheckin } from "../api/checkins";
import { CheckinWithWhisky } from "../types/database";
import { FeedStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<FeedStackParamList, "Feed">;

export default function FeedScreen({ navigation }: Props) {
  const [checkins, setCheckins] = useState<CheckinWithWhisky[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadInitial();
    }, [])
  );

  async function loadInitial() {
    setLoading(true);
    try {
      const data = await getMyCheckins(20);
      setCheckins(data);
      setHasMore(data.length === 20);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      const data = await getMyCheckins(20);
      setCheckins(data);
      setHasMore(data.length === 20);
    } finally {
      setRefreshing(false);
    }
  }

  function handleEdit(checkin: CheckinWithWhisky) {
    navigation.navigate("CheckIn", {
      whisky: checkin.whisky,
      existingCheckin: checkin,
    });
  }

  function handleDelete(checkin: CheckinWithWhisky) {
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

  async function loadMore() {
    if (!hasMore || loadingMore || checkins.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = checkins[checkins.length - 1].created_at;
      const data = await getMyCheckins(20, oldest);
      setCheckins((prev) => [...prev, ...data]);
      setHasMore(data.length === 20);
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#C8963E" size="large" />
      </View>
    );
  }

  if (checkins.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>🥃</Text>
        <Text style={styles.emptyTitle}>No drams logged yet</Text>
        <Text style={styles.emptyHint}>Search for a whisky to get started</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={checkins}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <CheckinCard
          checkin={item}
          onPress={() => navigation.navigate("WhiskyDetail", { whiskyId: item.whisky_id })}
          onEdit={() => handleEdit(item)}
          onDelete={() => handleDelete(item)}
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#C8963E"
        />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator color="#C8963E" style={styles.moreLoader} />
        ) : null
      }
    />
  );
}

function CheckinCard({
  checkin,
  onPress,
  onEdit,
  onDelete,
}: {
  checkin: CheckinWithWhisky;
  onPress: () => void;
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
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardDate}>
          {new Date(checkin.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </Text>
        <TouchableOpacity
          onPress={showOptions}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={styles.optionsBtn}
        >
          <Text style={styles.optionsBtnText}>•••</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#FAF8F5" },
  centered: {
    flex: 1,
    backgroundColor: "#FAF8F5",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#1A0E00", marginBottom: 8 },
  emptyHint: { color: "#7A5C3E", fontSize: 15, textAlign: "center" },
  moreLoader: { padding: 20 },

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
  cardName: { fontSize: 16, fontWeight: "700", color: "#1A0E00", marginBottom: 2 },
  cardDistillery: { fontSize: 13, color: "#C8963E", marginBottom: 6 },
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
  cardNotes: { fontSize: 13, color: "#7A5C3E" },
  cardRight: { alignItems: "flex-end", justifyContent: "space-between" },
  cardDate: { fontSize: 12, color: "#B8A090" },
  optionsBtn: { marginTop: 8 },
  optionsBtnText: { fontSize: 16, color: "#B8A090", letterSpacing: 1 },
});
