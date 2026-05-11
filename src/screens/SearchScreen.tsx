import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { searchWhiskies, findWhiskyMatch } from "../api/whiskies";
import { supabase } from "../lib/supabase";
import { Whisky } from "../types/database";
import { SearchStackParamList, WhiskyPrefill } from "../navigation/types";
import BottleCamera from "../components/BottleCamera";

type Props = NativeStackScreenProps<SearchStackParamList, "Search">;

export default function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Whisky[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [labelCameraOpen, setLabelCameraOpen] = useState(false);
  const [labelLoading, setLabelLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(text: string) {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);

    if (!text.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchWhiskies(text.trim());
        setResults(data);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  async function handleLabelCaptured(base64: string) {
    setLabelLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<WhiskyPrefill>(
        "identify-bottle",
        { body: { imageBase64: base64 } }
      );

      if (error) {
        let msg = error.message;
        try {
          if ("context" in error) {
            const body = await (error as any).context.json();
            msg = body?.error || msg;
          }
        } catch {}
        throw new Error(msg);
      }

      const prefill = data ?? {};

      if (prefill.name && prefill.distillery) {
        const existing = await findWhiskyMatch(prefill.name, prefill.distillery);
        if (existing) {
          navigation.navigate("WhiskyDetail", { whiskyId: existing.id });
          return;
        }
      }

      navigation.navigate("ManualEntry", { prefill });
    } catch (e: unknown) {
      Alert.alert(
        "Couldn't read label",
        (e as Error).message + "\n\nYou can add the whisky manually.",
        [
          { text: "Add Manually", onPress: () => navigation.navigate("ManualEntry", {}) },
          { text: "Try Again", style: "cancel" },
        ]
      );
    } finally {
      setLabelLoading(false);
    }
  }

  const showEmpty = searched && results.length === 0 && !loading;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="Search whiskies…"
          placeholderTextColor="#B8A090"
          value={query}
          onChangeText={handleQueryChange}
          returnKeyType="search"
          autoCorrect={false}
        />
        {loading && <ActivityIndicator color="#C8963E" style={styles.loader} />}
      </View>

      {showEmpty && (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No results for "{query}"</Text>
          <Text style={styles.emptyHint}>Add this whisky to DramLog</Text>
          <View style={styles.addOptions}>
            <TouchableOpacity
              style={styles.addOption}
              onPress={() => setLabelCameraOpen(true)}
            >
              <Text style={styles.addOptionIcon}>📷</Text>
              <Text style={styles.addOptionText}>Scan Label</Text>
              <Text style={styles.addOptionHint}>Let AI read the bottle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addOption}
              onPress={() => navigation.navigate("ManualEntry", {})}
            >
              <Text style={styles.addOptionIcon}>✏️</Text>
              <Text style={styles.addOptionText}>Add Manually</Text>
              <Text style={styles.addOptionHint}>Enter details yourself</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!showEmpty && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WhiskyRow
              whisky={item}
              onPress={() => navigation.navigate("WhiskyDetail", { whiskyId: item.id })}
            />
          )}
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
        />
      )}

      {labelLoading && (
        <View style={styles.labelLoadingOverlay}>
          <ActivityIndicator color="#C8963E" size="large" />
          <Text style={styles.labelLoadingText}>Reading label…</Text>
        </View>
      )}

      <BottleCamera
        visible={labelCameraOpen}
        onCaptureRaw={(base64) => {
          setLabelCameraOpen(false);
          handleLabelCaptured(base64);
        }}
        onCapture={() => {}}
        onCancel={() => setLabelCameraOpen(false)}
        hintText="Point camera at the bottle label"
      />
    </View>
  );
}

function WhiskyRow({ whisky, onPress }: { whisky: Whisky; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      {whisky.image_url ? (
        <Image source={{ uri: whisky.image_url }} style={styles.thumb} />
      ) : (
        <View style={styles.thumbPlaceholder}>
          <Text style={{ fontSize: 24 }}>🥃</Text>
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>{whisky.name}</Text>
        <Text style={styles.rowDistillery} numberOfLines={1}>{whisky.distillery}</Text>
        <View style={styles.rowMeta}>
          {whisky.region && <Text style={styles.metaTag}>{whisky.region}</Text>}
          {whisky.age ? <Text style={styles.metaTag}>{whisky.age}yr</Text> : <Text style={styles.metaTag}>NAS</Text>}
          {whisky.abv && <Text style={styles.metaTag}>{whisky.abv}%</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E8DDD0",
  },
  searchIcon: { fontSize: 18, marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 16, color: "#1A0E00" },
  loader: { marginLeft: 8 },
  list: { paddingBottom: 32 },

  centered: { padding: 32, alignItems: "center" },
  emptyText: { color: "#1A0E00", fontSize: 17, fontWeight: "700", marginBottom: 6 },
  emptyHint: { color: "#7A5C3E", fontSize: 14, marginBottom: 24 },

  addOptions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  addOption: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DDD0",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    gap: 4,
  },
  addOptionIcon: { fontSize: 28, marginBottom: 4 },
  addOptionText: { color: "#1A0E00", fontSize: 15, fontWeight: "700" },
  addOptionHint: { color: "#B8A090", fontSize: 12, textAlign: "center" },

  labelLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(250,248,245,0.92)",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  labelLoadingText: { color: "#1A0E00", fontSize: 16, fontWeight: "600" },

  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE6DC",
    alignItems: "center",
  },
  thumb: { width: 52, height: 52, borderRadius: 8, marginRight: 14 },
  thumbPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#F5EFE6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowBody: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: "700", color: "#1A0E00", marginBottom: 2 },
  rowDistillery: { fontSize: 13, color: "#C8963E", marginBottom: 6 },
  rowMeta: { flexDirection: "row", gap: 6 },
  metaTag: {
    fontSize: 12,
    color: "#7A5C3E",
    backgroundColor: "#F5EFE6",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    overflow: "hidden",
  },
});
