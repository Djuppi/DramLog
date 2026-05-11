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
import {
  getCollectionEntry,
  addToCollection,
  removeFromCollection,
  setOpenedDate,
} from "../api/collection";
import { WhiskyWithStats, CheckinWithWhisky, CollectionEntry } from "../types/database";
import OpenedDateSheet from "../components/OpenedDateSheet";

type Props =
  | NativeStackScreenProps<import("../navigation/types").FeedStackParamList, "WhiskyDetail">
  | NativeStackScreenProps<import("../navigation/types").SearchStackParamList, "WhiskyDetail">;

export default function WhiskyDetailScreen({ route, navigation }: any) {
  const { whiskyId } = route.params as { whiskyId: string };
  const [whisky, setWhisky] = useState<WhiskyWithStats | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<CheckinWithWhisky[]>([]);
  const [tried, setTried] = useState(false);
  const [loading, setLoading] = useState(true);
  const [collectionEntry, setCollectionEntry] = useState<CollectionEntry | null>(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [dateSheetVisible, setDateSheetVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [whiskyId])
  );

  async function loadData() {
    setLoading(true);
    try {
      const [w, checkins, hasTried, entry] = await Promise.all([
        getWhisky(whiskyId),
        getWhiskyCheckins(whiskyId, 5),
        hasTriedWhisky(whiskyId),
        getCollectionEntry(whiskyId),
      ]);
      setWhisky(w);
      setRecentCheckins(checkins);
      setTried(hasTried);
      setCollectionEntry(entry);
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

  async function handleAddToCollection() {
    setCollectionLoading(true);
    try {
      const entry = await addToCollection(whiskyId);
      setCollectionEntry(entry);
    } catch (e: unknown) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setCollectionLoading(false);
    }
  }

  async function handleRemoveFromCollection() {
    if (!collectionEntry) return;
    Alert.alert(
      "Remove from collection?",
      "This will remove the bottle and its opening date.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setCollectionLoading(true);
            try {
              await removeFromCollection(collectionEntry.id);
              setCollectionEntry(null);
            } catch (e: unknown) {
              Alert.alert("Error", (e as Error).message);
            } finally {
              setCollectionLoading(false);
            }
          },
        },
      ]
    );
  }

  async function handleOpenedDateConfirm(date: Date, isToday: boolean) {
    if (!collectionEntry || !whisky) return;
    setDateSheetVisible(false);
    setCollectionLoading(true);
    try {
      const updated = await setOpenedDate(collectionEntry.id, date);
      setCollectionEntry(updated);
      if (isToday) {
        navigation.navigate("CheckIn", { whisky });
      }
    } catch (e: unknown) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setCollectionLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#C8963E" size="large" />
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
    <>
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

        {/* Collection section */}
        <View style={styles.collectionSection}>
          {collectionLoading ? (
            <ActivityIndicator color="#C8963E" style={{ marginVertical: 8 }} />
          ) : collectionEntry ? (
            <View style={styles.inCollectionCard}>
              <View style={styles.inCollectionHeader}>
                <View style={styles.inCollectionBadge}>
                  <Text style={styles.inCollectionBadgeText}>In your collection</Text>
                </View>
                <TouchableOpacity onPress={handleRemoveFromCollection}>
                  <Text style={styles.removeLink}>Remove</Text>
                </TouchableOpacity>
              </View>

              {collectionEntry.opened_at ? (
                <View style={styles.openedRow}>
                  <Text style={styles.openedLabel}>Opened</Text>
                  <Text style={styles.openedDate}>
                    {new Date(collectionEntry.opened_at).toLocaleDateString()}
                  </Text>
                  <TouchableOpacity onPress={() => setDateSheetVisible(true)}>
                    <Text style={styles.changeLink}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.markOpenedBtn}
                  onPress={() => setDateSheetVisible(true)}
                >
                  <Text style={styles.markOpenedBtnText}>Mark as Opened</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity style={styles.addToCollectionBtn} onPress={handleAddToCollection}>
              <Text style={styles.addToCollectionBtnText}>Add to Collection</Text>
            </TouchableOpacity>
          )}
        </View>

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

      <OpenedDateSheet
        visible={dateSheetVisible}
        onConfirm={handleOpenedDateConfirm}
        onCancel={() => setDateSheetVisible(false)}
      />
    </>
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
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  content: { paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: "#FAF8F5", alignItems: "center", justifyContent: "center" },
  errorText: { color: "#1A0E00" },
  image: { width: "100%", height: 260 },
  imagePlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: "#F5EFE6",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: { fontSize: 64 },
  header: { padding: 20 },
  name: { fontSize: 26, fontWeight: "800", color: "#1A0E00", marginBottom: 4 },
  distillery: { fontSize: 18, color: "#C8963E", marginBottom: 16 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DDD0",
    overflow: "hidden",
  },
  checkInButton: {
    marginHorizontal: 20,
    backgroundColor: "#C8963E",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  checkInButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  collectionSection: { marginHorizontal: 20, marginBottom: 28 },
  addToCollectionBtn: {
    borderWidth: 1.5,
    borderColor: "#C8963E",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  addToCollectionBtnText: { color: "#C8963E", fontSize: 15, fontWeight: "600" },

  inCollectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DDD0",
    padding: 16,
  },
  inCollectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  inCollectionBadge: {
    backgroundColor: "#EAF5EC",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inCollectionBadgeText: { color: "#2E7D32", fontSize: 13, fontWeight: "600" },
  removeLink: { color: "#B8A090", fontSize: 13 },

  openedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  openedLabel: { color: "#7A5C3E", fontSize: 14 },
  openedDate: { color: "#1A0E00", fontSize: 14, fontWeight: "600", flex: 1 },
  changeLink: { color: "#C8963E", fontSize: 13, fontWeight: "600" },

  markOpenedBtn: {
    borderWidth: 1,
    borderColor: "#E8DDD0",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  markOpenedBtnText: { color: "#7A5C3E", fontSize: 14, fontWeight: "600" },

  section: { paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A0E00",
    marginBottom: 12,
  },
  checkinRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE6DC",
  },
  checkinLeft: { flex: 1, marginRight: 8 },
  checkinRating: { fontSize: 20, fontWeight: "800", color: "#C8963E", marginBottom: 2 },
  checkinNotes: { color: "#7A5C3E", fontSize: 14 },
  checkinDate: { color: "#B8A090", fontSize: 13 },
});

const tagStyles = StyleSheet.create({
  container: {
    backgroundColor: "#F5EFE6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: { color: "#7A5C3E", fontSize: 13 },
});

const statStyles = StyleSheet.create({
  box: { flex: 1, alignItems: "center", paddingVertical: 16 },
  value: { fontSize: 22, fontWeight: "800", color: "#C8963E" },
  label: { fontSize: 12, color: "#B8A090", marginTop: 2 },
});
