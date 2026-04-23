import React, { useState } from "react";
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
import { createWhisky } from "../api/whiskies";
import BottleCamera from "../components/BottleCamera";
import { ScanStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<ScanStackParamList, "ManualEntry">;

export default function ManualEntryScreen({ route, navigation }: Props) {
  const { barcode } = route.params ?? {};

  const [name, setName] = useState("");
  const [distillery, setDistillery] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [age, setAge] = useState("");
  const [abv, setAbv] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !distillery.trim()) {
      Alert.alert("Required fields", "Name and distillery are required");
      return;
    }

    const ageNum = age ? parseInt(age, 10) : undefined;
    const abvNum = abv ? parseFloat(abv) : undefined;

    if (ageNum !== undefined && (isNaN(ageNum) || ageNum < 1 || ageNum > 99)) {
      Alert.alert("Invalid age", "Age must be between 1 and 99 years");
      return;
    }
    if (abvNum !== undefined && (isNaN(abvNum) || abvNum <= 0 || abvNum > 100)) {
      Alert.alert("Invalid ABV", "ABV must be between 0 and 100");
      return;
    }

    setLoading(true);
    try {
      const whisky = await createWhisky({
        name: name.trim(),
        distillery: distillery.trim(),
        region: region.trim() || undefined,
        country: country.trim() || undefined,
        age: ageNum,
        abv: abvNum,
        image_url: imageUrl.trim() || undefined,
      });
      navigation.replace("WhiskyDetail", { whiskyId: whisky.id });
    } catch (e: unknown) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
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
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={() => setCameraOpen(true)}
                >
                  <Text style={styles.retakeBtnText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={() => setCameraOpen(true)}
              >
                <Text style={styles.photoBtnIcon}>📷</Text>
                <Text style={styles.photoBtnText}>Photograph Bottle</Text>
                <Text style={styles.photoBtnHint}>Background will be removed automatically</Text>
              </TouchableOpacity>
            )}
          </View>

          <Field label="Whisky Name *" value={name} onChange={setName} placeholder="e.g. 12 Year Old" />
          <Field label="Distillery *" value={distillery} onChange={setDistillery} placeholder="e.g. Glenfiddich" />
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
        placeholderTextColor="#6a5040"
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a0e00" },
  content: { padding: 24, paddingBottom: 48 },
  barcodeBadge: {
    backgroundColor: "#2a1c0c",
    borderRadius: 8,
    padding: 10,
    marginBottom: 24,
  },
  barcodeBadgeText: { color: "#a0856a", fontSize: 13 },

  photoSection: { marginBottom: 28 },
  photoBtn: {
    backgroundColor: "#2a1c0c",
    borderWidth: 1,
    borderColor: "#4a3020",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    gap: 6,
  },
  photoBtnIcon: { fontSize: 32, marginBottom: 4 },
  photoBtnText: { color: "#f5e6d0", fontSize: 16, fontWeight: "600" },
  photoBtnHint: { color: "#6a5040", fontSize: 12 },

  previewWrapper: { alignItems: "center", gap: 12 },
  preview: {
    width: 160,
    height: 280,
    borderRadius: 12,
    backgroundColor: "#2a1c0c",
  },
  retakeBtn: {
    borderWidth: 1,
    borderColor: "#c8963e",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retakeBtnText: { color: "#c8963e", fontSize: 14, fontWeight: "600" },

  button: {
    backgroundColor: "#c8963e",
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
  label: { color: "#a0856a", fontSize: 14, marginBottom: 8, fontWeight: "600" },
  input: {
    backgroundColor: "#2a1c0c",
    borderColor: "#4a3020",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#f5e6d0",
  },
});
