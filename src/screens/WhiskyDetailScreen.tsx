import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { getWhisky } from "../api/whiskies";
import { getWhiskyCheckins, hasTriedWhisky } from "../api/checkins";
import { WhiskyWithStats } from "../types/database";
import { CheckinWithWhisky } from "../types/database";

type Props =
  | NativeStackScreenProps<import("../navigation/types").FeedStackParamList, "WhiskyDetail">
  | NativeStackScreenProps<import("../navigation/types").ScanStackParamList, "WhiskyDetail">
  | NativeStackScreenProps<import("../navigation/types").SearchStackParamList, "WhiskyDetail">;

export default function WhiskyDetailScreen({ route, navigation }: any) {
  const { whiskyId } = route.params as { whiskyId: string };
  const [whisky, setWhisky] = useState<WhiskyWithStats | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<CheckinWithWhisky[]>([]);
  const [tried, setTried] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [whiskyId])
  );

  async function loadData() {
    setLoading(true);
    try {
      const [w, checkins, hasTried] = await Promise.all([
        getWhisky(whiskyId),
        getWhiskyCheckins(whiskyId, 5),
        hasTriedWhisky(whiskyId),
      ]);
      setWhisky(w);
      setRecentCheckins(checkins);
      setTried(hasTried);
    } catch (e: unknown) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleCheckIn() {
    if (!whisky) return;
    navigation.navigate("CheckIn", { whisky });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#c8963e" size="large" />
      </View>
    );
  }

  if (!whisky) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Whisky not found</Text>
      </View>
    );
  }

  const stats = whisky.stats;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {whisky.image_url ? (
        <Image source={{ uri: whisky.image_url }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>🥃</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.name}>{whisky.name}</Text>
        <Text style={styles.distillery}>{whisky.distillery}</Text>

        <View style={styles.tags}>
          {whisky.region && <Tag label={whisky.region} />}
          {whisky.country && <Tag label={whisky.country} />}
          {whisky.age ? <Tag label={`${whisky.age}yr`} /> : <Tag label="NAS" />}
          {whisky.abv && <Tag label={`${whisky.abv}% ABV`} />}
        </View>
      </View>

      {stats && (
        <View style={styles.statsRow}>
          <StatBox label="Avg Rating" value={stats.avg_rating ? stats.avg_rating.toString() : "—"} />
          <StatBox label="Check-ins" value={stats?.checkin_count?.toString() ?? "—"} />
          <StatBox label="Tasters" value={stats?.unique_tasters?.toString() ?? "—"} />
        </View>
      )}

      <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
        <Text style={styles.checkInButtonText}>
          {tried ? "Log Another Dram" : "Check-in Dram"}
        </Text>
      </TouchableOpacity>

      {recentCheckins.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Check-ins</Text>
          {recentCheckins.map((c) => (
            <View key={c.id} style={styles.checkinRow}>
              <View style={styles.checkinLeft}>
                {c.rating !== null && (
                  <Text style={styles.checkinRating}>{c.rating.toFixed(1)}</Text>
                )}
                {c.notes ? (
                  <Text style={styles.checkinNotes} numberOfLines={2}>
                    {c.notes}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.checkinDate}>
                {new Date(c.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={tagStyles.container}>
      <Text style={tagStyles.text}>{label}</Text>
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a0e00" },
  content: { paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: "#1a0e00", alignItems: "center", justifyContent: "center" },
  errorText: { color: "#f5e6d0" },
  image: { width: "100%", height: 260 },
  imagePlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: "#2a1c0c",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: { fontSize: 64 },
  header: { padding: 20 },
  name: { fontSize: 26, fontWeight: "800", color: "#f5e6d0", marginBottom: 4 },
  distillery: { fontSize: 18, color: "#c8963e", marginBottom: 16 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#2a1c0c",
    borderRadius: 16,
    overflow: "hidden",
  },
  checkInButton: {
    marginHorizontal: 20,
    backgroundColor: "#c8963e",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 32,
  },
  checkInButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  section: { paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f5e6d0",
    marginBottom: 12,
  },
  checkinRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a1c0c",
  },
  checkinLeft: { flex: 1, marginRight: 8 },
  checkinRating: { fontSize: 20, fontWeight: "800", color: "#c8963e", marginBottom: 2 },
  checkinNotes: { color: "#a0856a", fontSize: 14 },
  checkinDate: { color: "#6a5040", fontSize: 13 },
});

const tagStyles = StyleSheet.create({
  container: {
    backgroundColor: "#2a1c0c",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: { color: "#a0856a", fontSize: 13 },
});

const statStyles = StyleSheet.create({
  box: { flex: 1, alignItems: "center", paddingVertical: 16 },
  value: { fontSize: 22, fontWeight: "800", color: "#c8963e" },
  label: { fontSize: 12, color: "#6a5040", marginTop: 2 },
});
