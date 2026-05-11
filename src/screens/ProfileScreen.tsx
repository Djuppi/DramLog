import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { getMyStats } from "../api/checkins";
import { isAdmin } from "../api/admin";
import { getMyCollection, CollectionWithWhisky } from "../api/collection";
import { MARKS, MARK_CATEGORIES, MarkStats } from "../config/marks";
import { ProfileStackParamList } from "../navigation/types";
import MarkBadge from "../components/MarkBadge";

type Props = NativeStackScreenProps<ProfileStackParamList, "Profile">;

export default function ProfileScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<{
    totalCheckins: number;
    uniqueWhiskies: number;
    avgRating: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [collection, setCollection] = useState<CollectionWithWhisky[]>([]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        getMyStats(),
        isAdmin(),
        getMyCollection().catch(() => [] as CollectionWithWhisky[]),
      ])
        .then(([s, adminFlag, col]) => {
          setStats(s);
          setAdmin(adminFlag);
          setCollection(col);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  const markStats = useMemo((): MarkStats => {
    const regionCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    for (const entry of collection) {
      const { region, country } = entry.whisky;
      if (region) {
        const key = region.toLowerCase().trim();
        regionCounts[key] = (regionCounts[key] ?? 0) + 1;
      }
      if (country) {
        const key = country.toLowerCase().trim();
        countryCounts[key] = (countryCounts[key] ?? 0) + 1;
      }
    }
    return { collectionCount: collection.length, regionCounts, countryCounts };
  }, [collection]);

  const earnedIds = useMemo(
    () => new Set(MARKS.filter((m) => m.check(markStats)).map((m) => m.id)),
    [markStats]
  );

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (e: unknown) {
            Alert.alert("Error", (e as Error).message);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user?.email?.[0]?.toUpperCase() ?? "?"}
        </Text>
      </View>
      <Text style={styles.email}>{user?.email}</Text>

      {loading ? (
        <ActivityIndicator color="#C8963E" style={styles.loader} />
      ) : stats ? (
        <View style={styles.statsGrid}>
          <StatCard label="Total Drams" value={stats.totalCheckins.toString()} />
          <StatCard label="Whiskies" value={stats.uniqueWhiskies.toString()} />
          <StatCard
            label="Avg Rating"
            value={stats.avgRating !== null ? stats.avgRating.toFixed(1) : "—"}
          />
        </View>
      ) : null}

      {/* ── Collection ─────────────────────────────────────────────────────── */}
      {!loading && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            My Collection
            <Text style={styles.sectionCount}> ({collection.length})</Text>
          </Text>

          {collection.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No bottles yet.</Text>
              <Text style={styles.emptyHint}>
                Search for a whisky and add it to your collection.
              </Text>
            </View>
          ) : (
            collection.map((entry) => (
              <CollectionRow
                key={entry.id}
                entry={entry}
                onPress={() => navigation.navigate("WhiskyDetail", { whiskyId: entry.whisky_id })}
              />
            ))
          )}
        </View>
      )}

      {/* ── Marks ──────────────────────────────────────────────────────────── */}
      {!loading && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Marks
            <Text style={styles.sectionCount}>
              {" "}({earnedIds.size}/{MARKS.length})
            </Text>
          </Text>

          {MARK_CATEGORIES.map(({ key, label }) => {
            const categoryMarks = MARKS.filter((m) => m.category === key);
            return (
              <View key={key} style={styles.markCategory}>
                <Text style={styles.markCategoryLabel}>{label}</Text>
                <View style={styles.marksRow}>
                  {categoryMarks.map((def) => (
                    <MarkBadge
                      key={def.id}
                      def={def}
                      unlocked={earnedIds.has(def.id)}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {admin && (
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => navigation.navigate("Admin")}
        >
          <Text style={styles.adminButtonText}>Admin Panel</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function CollectionRow({ entry, onPress }: { entry: CollectionWithWhisky; onPress: () => void }) {
  const { whisky, opened_at } = entry;
  return (
    <TouchableOpacity style={rowStyles.container} onPress={onPress} activeOpacity={0.8}>
      {whisky.image_url ? (
        <Image source={{ uri: whisky.image_url }} style={rowStyles.thumb} />
      ) : (
        <View style={rowStyles.thumbPlaceholder}>
          <Text style={{ fontSize: 22 }}>🥃</Text>
        </View>
      )}
      <View style={rowStyles.body}>
        <Text style={rowStyles.name} numberOfLines={1}>{whisky.name}</Text>
        <Text style={rowStyles.distillery} numberOfLines={1}>{whisky.distillery}</Text>
        <View style={rowStyles.meta}>
          {whisky.region && <Text style={rowStyles.tag}>{whisky.region}</Text>}
          {whisky.age ? <Text style={rowStyles.tag}>{whisky.age}yr</Text> : null}
          {whisky.abv ? <Text style={rowStyles.tag}>{whisky.abv}%</Text> : null}
        </View>
      </View>
      <View style={rowStyles.right}>
        {opened_at ? (
          <>
            <View style={rowStyles.openedDot} />
            <Text style={rowStyles.openedDate}>
              {new Date(opened_at).toLocaleDateString()}
            </Text>
          </>
        ) : (
          <Text style={rowStyles.unopened}>Unopened</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  content: { alignItems: "center", padding: 24, paddingBottom: 48 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#C8963E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 36, fontWeight: "800", color: "#fff" },
  email: { color: "#7A5C3E", fontSize: 15, marginBottom: 28 },
  loader: { marginVertical: 24 },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
    width: "100%",
  },
  section: {
    width: "100%",
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A0E00",
    marginBottom: 16,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: "400",
    color: "#B8A090",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DDD0",
    padding: 20,
    alignItems: "center",
  },
  emptyText: { color: "#1A0E00", fontSize: 15, fontWeight: "600", marginBottom: 4 },
  emptyHint: { color: "#B8A090", fontSize: 13, textAlign: "center" },

  markCategory: { marginBottom: 8 },
  markCategoryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B8A090",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  marksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  adminButton: {
    backgroundColor: "#C8963E",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginBottom: 12,
  },
  adminButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  signOutButton: {
    borderWidth: 1,
    borderColor: "#C8963E",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  signOutText: { color: "#C8963E", fontSize: 16, fontWeight: "600" },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DDD0",
    padding: 16,
    alignItems: "center",
  },
  value: { fontSize: 24, fontWeight: "800", color: "#C8963E" },
  label: { fontSize: 11, color: "#B8A090", marginTop: 4, textAlign: "center" },
});

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8DDD0",
    padding: 12,
    marginBottom: 10,
  },
  thumb: { width: 48, height: 48, borderRadius: 8, marginRight: 12 },
  thumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#F5EFE6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  body: { flex: 1, marginRight: 8 },
  name: { fontSize: 14, fontWeight: "700", color: "#1A0E00", marginBottom: 2 },
  distillery: { fontSize: 12, color: "#C8963E", marginBottom: 4 },
  meta: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  tag: {
    fontSize: 11,
    color: "#7A5C3E",
    backgroundColor: "#F5EFE6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  right: { alignItems: "flex-end", minWidth: 60 },
  openedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C8963E",
    marginBottom: 4,
  },
  openedDate: { fontSize: 10, color: "#B8A090", textAlign: "right" },
  unopened: { fontSize: 11, color: "#B8A090", fontStyle: "italic" },
});
