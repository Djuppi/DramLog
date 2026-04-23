import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { listAllWhiskies, deleteWhisky } from "../api/admin";
import { Whisky } from "../types/database";
import { ProfileStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<ProfileStackParamList, "Admin">;

const PAGE_SIZE = 30;

export default function AdminScreen({ navigation }: Props) {
  const [whiskies, setWhiskies] = useState<Whisky[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offset = useRef(0);

  useFocusEffect(
    useCallback(() => {
      loadPage("", true);
    }, [])
  );

  async function loadPage(query: string, reset: boolean) {
    if (reset) {
      offset.current = 0;
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const data = await listAllWhiskies(query, PAGE_SIZE, offset.current);
      offset.current += data.length;
      setHasMore(data.length === PAGE_SIZE);
      setWhiskies(reset ? data : (prev) => [...prev, ...data]);
    } catch (e: unknown) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function handleSearchChange(text: string) {
    setSearch(text);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => loadPage(text, true), 350);
  }

  function handleEdit(whisky: Whisky) {
    navigation.navigate("EditWhisky", { whiskyId: whisky.id });
  }

  function handleDelete(whisky: Whisky) {
    Alert.alert(
      "Delete Whisky",
      `Delete "${whisky.name}" by ${whisky.distillery}?\n\nThis will also affect any check-ins logged against it.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWhisky(whisky.id);
              setWhiskies((prev) => prev.filter((w) => w.id !== whisky.id));
            } catch (e: unknown) {
              Alert.alert("Error", (e as Error).message);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="Filter whiskies…"
          placeholderTextColor="#6a5040"
          value={search}
          onChangeText={handleSearchChange}
          autoCorrect={false}
        />
      </View>

      {loading ? (
        <ActivityIndicator color="#c8963e" style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={whiskies}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WhiskyRow
              whisky={item}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          keyboardDismissMode="on-drag"
          onEndReached={() => {
            if (hasMore && !loadingMore) loadPage(search, false);
          }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <Text style={styles.empty}>No whiskies found</Text>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color="#c8963e" style={styles.loader} />
            ) : null
          }
        />
      )}
    </View>
  );
}

function WhiskyRow({
  whisky,
  onEdit,
  onDelete,
}: {
  whisky: Whisky;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>{whisky.name}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {whisky.distillery}
          {whisky.region ? ` · ${whisky.region}` : ""}
          {whisky.age ? ` · ${whisky.age}yr` : " · NAS"}
          {whisky.abv ? ` · ${whisky.abv}%` : ""}
        </Text>
        {whisky.canonical_id && (
          <Text style={styles.mergedBadge}>merged duplicate</Text>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a0e00" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a1c0c",
    margin: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#4a3020",
  },
  searchIcon: { fontSize: 18, marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 16, color: "#f5e6d0" },
  loader: { marginTop: 40 },
  empty: { color: "#6a5040", textAlign: "center", marginTop: 40, fontSize: 15 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a1c0c",
  },
  rowBody: { flex: 1, marginRight: 12 },
  rowName: { fontSize: 15, fontWeight: "700", color: "#f5e6d0", marginBottom: 2 },
  rowMeta: { fontSize: 12, color: "#a0856a" },
  mergedBadge: {
    fontSize: 11,
    color: "#c8963e",
    marginTop: 2,
    fontStyle: "italic",
  },
  actions: { flexDirection: "row", gap: 8 },
  editBtn: {
    backgroundColor: "#2a1c0c",
    borderWidth: 1,
    borderColor: "#c8963e",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editBtnText: { color: "#c8963e", fontSize: 13, fontWeight: "600" },
  deleteBtn: {
    backgroundColor: "#2a1c0c",
    borderWidth: 1,
    borderColor: "#7a2020",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteBtnText: { color: "#c05050", fontSize: 13, fontWeight: "600" },
});
