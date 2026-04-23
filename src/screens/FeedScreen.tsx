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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getMyCheckins } from "../api/checkins";
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
        <ActivityIndicator color="#c8963e" size="large" />
      </View>
    );
  }

  if (checkins.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>🥃</Text>
        <Text style={styles.emptyTitle}>No drams logged yet</Text>
        <Text style={styles.emptyHint}>Scan a bottle or search to get started</Text>
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
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#c8963e"
        />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator color="#c8963e" style={styles.moreLoader} />
        ) : null
      }
    />
  );
}

function CheckinCard({
  checkin,
  onPress,
}: {
  checkin: CheckinWithWhisky;
  onPress: () => void;
}) {
  const w = checkin.whisky;
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
      <Text style={styles.cardDate}>
        {new Date(checkin.created_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#1a0e00" },
  centered: {
    flex: 1,
    backgroundColor: "#1a0e00",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#f5e6d0", marginBottom: 8 },
  emptyHint: { color: "#a0856a", fontSize: 15, textAlign: "center" },
  moreLoader: { padding: 20 },

  card: {
    flexDirection: "row",
    backgroundColor: "#1e1208",
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2a1c0c",
  },
  cardLeft: { marginRight: 14 },
  thumb: { width: 60, height: 60, borderRadius: 10 },
  thumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#2a1c0c",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbEmoji: { fontSize: 28 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "700", color: "#f5e6d0", marginBottom: 2 },
  cardDistillery: { fontSize: 13, color: "#c8963e", marginBottom: 6 },
  cardMeta: { flexDirection: "row", gap: 8, marginBottom: 4 },
  cardRating: { fontSize: 15, fontWeight: "800", color: "#c8963e" },
  cardServing: {
    fontSize: 12,
    color: "#6a5040",
    backgroundColor: "#2a1c0c",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  cardNotes: { fontSize: 13, color: "#a0856a" },
  cardDate: { fontSize: 12, color: "#6a5040", alignSelf: "flex-start" },
});
