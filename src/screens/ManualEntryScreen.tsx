import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createWhisky, searchWhiskies, findWhiskyMatch } from "../api/whiskies";
import BottleCamera from "../components/BottleCamera";
import { SearchStackParamList } from "../navigation/types";
import { Whisky } from "../types/database";

type Props = NativeStackScreenProps<SearchStackParamList, "ManualEntry">;

export default function ManualEntryScreen({ route, navigation }: Props) {
  const { barcode, prefill } = route.params ?? {};

  const [name, setName] = useState(prefill?.name ?? "");
  const [distillery, setDistillery] = useState(prefill?.distillery ?? "");
  const [region, setRegion] = useState(prefill?.region ?? "");
  const [country, setCountry] = useState(prefill?.country ?? "");
  const [age, setAge] = useState(prefill?.age != null ? String(prefill.age) : "");
  const [abv, setAbv] = useState(prefill?.abv != null ? String(prefill.abv) : "");
  const [bottleSize, setBottleSize] = useState(prefill?.bottle_size != null ? String(prefill.bottle_size) : "");
  const [imageUrl, setImageUrl] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fromScan = !!(prefill?.name && prefill?.distillery);
  const [suggestions, setSuggestions] = useState<Whisky[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const nameTerm = name.trim();
    const distTerm = distillery.trim();

    if (nameTerm.length < 2 && distTerm.length < 2) {
      setSuggestions([]);
      isFirstRender.current = false;
      return;
    }

    const delay = isFirstRender.current ? 0 : 400;
    isFirstRender.current = false;

    debounce.current = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const queries: Promise<Whisky[]>[] = [];
        if (nameTerm.length >= 2) queries.push(searchWhiskies(nameTerm, 10));
        if (distTerm.length >= 2 && distTerm !== nameTerm) queries.push(searchWhiskies(distTerm, 10));
        const batches = await Promise.all(queries);
        const seen = new Set<string>();
        const merged = batches.flat().filter((w) => {
          if (seen.has(w.id)) return false;
          seen.add(w.id);
          return true;
        });
        setSuggestions(merged);
      } finally {
        setSuggestionsLoading(false);
      }
    }, delay);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [name, distillery]);

  async function handleSubmit() {
    if (!name.trim() || !distillery.trim()) {
      Alert.alert("Required fields", "Name and distillery are required");
      return;
    }

    const ageNum = age ? parseInt(age, 10) : undefined;
    const abvNum = abv ? parseFloat(abv) : undefined;
    const bottleSizeNum = bottleSize ? parseInt(bottleSize, 10) : undefined;

    if (ageNum !== undefined && (isNaN(ageNum) || ageNum < 1 || ageNum > 99)) {
      Alert.alert("Invalid age", "Age must be between 1 and 99 years");
      return;
    }
    if (abvNum !== undefined && (isNaN(abvNum) || abvNum <= 0 || abvNum > 100)) {
      Alert.alert("Invalid ABV", "ABV must be between 0 and 100");
      return;
    }
    if (bottleSizeNum !== undefined && (isNaN(bottleSizeNum) || bottleSizeNum < 1)) {
      Alert.alert("Invalid bottle size", "Enter size in ml, e.g. 700");
      return;
    }

    setLoading(true);
    try {
      // Exact-match guard before creating
      const existing = await findWhiskyMatch(name.trim(), distillery.trim());
      if (existing) {
        setLoading(false);
        Alert.alert(
          "Already in the database",
          `"${existing.name}" by ${existing.distillery} already exists. Use the existing entry?`,
          [
            {
              text: "Yes, use existing",
              onPress: () => navigation.replace("WhiskyDetail", { whiskyId: existing.id }),
            },
            {
              text: "Add anyway",
              onPress: () => doCreate(ageNum, abvNum, bottleSizeNum),
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return;
      }
      await doCreate(ageNum, abvNum, bottleSizeNum);
    } catch (e: unknown) {
      Alert.alert("Error", (e as Error).message);
      setLoading(false);
    }
  }

  async function doCreate(ageNum?: number, abvNum?: number, bottleSizeNum?: number) {
    setLoading(true);
    try {
      const whisky = await createWhisky({
        name: name.trim(),
        distillery: distillery.trim(),
        region: region.trim() || undefined,
        country: country.trim() || undefined,
        age: ageNum,
        abv: abvNum,
        bottle_size: bottleSizeNum,
        image_url: imageUrl.trim() || undefined,
      });
      navigation.replace("WhiskyDetail", { whiskyId: whisky.id });
    } catch (e: unknown) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const showSuggestions =
    suggestions.length > 0 && (name.trim().length >= 2 || distillery.trim().length >= 2);

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {fromScan && (
            <View style={styles.scanBanner}>
              <Text style={styles.scanBannerTitle}>AI-detected — please review</Text>
              <Text style={styles.scanBannerBody}>
                Label scanning can misread names. Check the details below and use an existing entry if one matches.
              </Text>
            </View>
          )}

          {barcode && (
            <View style={styles.barcodeBadge}>
              <Text style={styles.barcodeBadgeText}>Barcode: {barcode}</Text>
            </View>
          )}

          {/* Bottle photo */}
          <View style={styles.photoSection}>
            <Text style={fieldStyles.label}>Bottle Photo</Text>
            {imageUrl ? (
              <View style={styles.previewWrapper}>
                <Image source={{ uri: imageUrl }} style={styles.preview} resizeMode="contain" />
                <TouchableOpacity style={styles.retakeBtn} onPress={() => setCameraOpen(true)}>
                  <Text style={styles.retakeBtnText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.photoBtn} onPress={() => setCameraOpen(true)}>
                <Text style={styles.photoBtnIcon}>📷</Text>
                <Text style={styles.photoBtnText}>Photograph Bottle</Text>
                <Text style={styles.photoBtnHint}>Background will be removed automatically</Text>
              </TouchableOpacity>
            )}
          </View>

          <Field label="Whisky Name *" value={name} onChange={setName} placeholder="e.g. 12 Year Old" />
          <Field label="Distillery *" value={distillery} onChange={setDistillery} placeholder="e.g. Glenfiddich" />
          {/* Live duplicate suggestions — triggered by name or distillery */}
          {(showSuggestions || suggestionsLoading) && (
            <View style={styles.suggestionsCard}>
              <View style={styles.suggestionsHeader}>
                <Text style={styles.suggestionsTitle}>
                {fromScan ? "Is this your bottle?" : "Already in the database"}
              </Text>
                {suggestionsLoading && <ActivityIndicator size="small" color="#C8963E" />}
              </View>
              <Text style={styles.suggestionsHint}>
                Tap a match to use the existing entry instead of adding a duplicate.
              </Text>
              {suggestions.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  style={styles.suggestionRow}
                  onPress={() => navigation.replace("WhiskyDetail", { whiskyId: w.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionBody}>
                    <Text style={styles.suggestionName} numberOfLines={1}>{w.name}</Text>
                    <Text style={styles.suggestionMeta} numberOfLines={1}>
                      {w.distillery}
                      {w.region ? ` · ${w.region}` : ""}
                      {w.age ? ` · ${w.age}yr` : ""}
                      {w.abv ? ` · ${w.abv}%` : ""}
                    </Text>
                  </View>
                  <Text style={styles.suggestionArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Field label="Region" value={region} onChange={setRegion} placeholder="e.g. Speyside" />
          <Field label="Country" value={country} onChange={setCountry} placeholder="e.g. Scotland" />
          <Field
            label="Age (years)"
            value={age}
            onChange={setAge}
            placeholder="Leave blank for NAS"
            keyboardType="numeric"
          />
          <Field
            label="ABV (%)"
            value={abv}
            onChange={setAbv}
            placeholder="e.g. 43.0"
            keyboardType="decimal-pad"
          />
          <Field
            label="Bottle Size (ml)"
            value={bottleSize}
            onChange={setBottleSize}
            placeholder="e.g. 700"
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Add Whisky</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottleCamera
        visible={cameraOpen}
        onCapture={(url) => {
          setImageUrl(url);
          setCameraOpen(false);
        }}
        onCancel={() => setCameraOpen(false)}
      />
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
}) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={fieldStyles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#B8A090"
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  content: { padding: 24, paddingBottom: 48 },
  scanBanner: {
    backgroundColor: "#FFF8EC",
    borderWidth: 1.5,
    borderColor: "#F0C060",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  scanBannerTitle: { fontSize: 13, fontWeight: "700", color: "#7A5C3E", marginBottom: 4 },
  scanBannerBody: { fontSize: 12, color: "#B8A090", lineHeight: 17 },

  barcodeBadge: {
    backgroundColor: "#F5EFE6",
    borderRadius: 8,
    padding: 10,
    marginBottom: 24,
  },
  barcodeBadgeText: { color: "#7A5C3E", fontSize: 13 },

  photoSection: { marginBottom: 28 },
  photoBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DDD0",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    gap: 6,
  },
  photoBtnIcon: { fontSize: 32, marginBottom: 4 },
  photoBtnText: { color: "#1A0E00", fontSize: 16, fontWeight: "600" },
  photoBtnHint: { color: "#B8A090", fontSize: 12 },

  previewWrapper: { alignItems: "center", gap: 12 },
  preview: { width: 160, height: 280, borderRadius: 12, backgroundColor: "#F5EFE6" },
  retakeBtn: {
    borderWidth: 1,
    borderColor: "#C8963E",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retakeBtnText: { color: "#C8963E", fontSize: 14, fontWeight: "600" },

  suggestionsCard: {
    backgroundColor: "#FFFBF5",
    borderWidth: 1.5,
    borderColor: "#F0C060",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  suggestionsTitle: { fontSize: 13, fontWeight: "700", color: "#7A5C3E" },
  suggestionsHint: { fontSize: 12, color: "#B8A090", marginBottom: 10 },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0E8DF",
  },
  suggestionBody: { flex: 1 },
  suggestionName: { fontSize: 14, fontWeight: "600", color: "#1A0E00", marginBottom: 2 },
  suggestionMeta: { fontSize: 12, color: "#7A5C3E" },
  suggestionArrow: { fontSize: 16, color: "#C8963E", paddingLeft: 8 },

  button: {
    backgroundColor: "#C8963E",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

const fieldStyles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: { color: "#7A5C3E", fontSize: 14, marginBottom: 8, fontWeight: "600" },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DDD0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1A0E00",
  },
});
