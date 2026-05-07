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
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { searchWhiskies } from "../api/whiskies";
import { Whisky } from "../types/database";
import { SearchStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<SearchStackParamList, "Search">;

export default function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Whisky[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
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

      {searched && results.length === 0 && !loading && (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No results for "{query}"</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("ManualEntry", {})}
          >
            <Text style={styles.addButtonText}>+ Add it manually</Text>
          </TouchableOpacity>
        </View>
      )}

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
  emptyText: { color: "#7A5C3E", fontSize: 16 },
  addButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#C8963E",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  addButtonText: { color: "#C8963E", fontSize: 15, fontWeight: "600" },

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
