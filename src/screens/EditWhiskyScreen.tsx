import React, { useState, useEffect } from "react";
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
import BottleCamera from "../components/BottleCamera";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getWhisky } from "../api/whiskies";
import { updateWhisky } from "../api/admin";
import { ProfileStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<ProfileStackParamList, "EditWhisky">;

export default function EditWhiskyScreen({ route, navigation }: Props) {
  const { whiskyId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const [name, setName] = useState("");
  const [distillery, setDistillery] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [age, setAge] = useState("");
  const [abv, setAbv] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    getWhisky(whiskyId)
      .then((w) => {
        if (!w) return;
        setName(w.name);
        setDistillery(w.distillery);
        setRegion(w.region ?? "");
        setCountry(w.country ?? "");
        setAge(w.age !== null ? String(w.age) : "");
        setAbv(w.abv !== null ? String(w.abv) : "");
        setImageUrl(w.image_url ?? "");
      })
      .catch((e: unknown) => Alert.alert("Error", (e as Error).message))
      .finally(() => setLoading(false));
  }, [whiskyId]);

  async function handleSave() {
    if (!name.trim() || !distillery.trim()) {
      Alert.alert("Required", "Name and distillery cannot be empty");
      return;
    }

    const ageNum = age.trim() ? parseInt(age, 10) : undefined;
    const abvNum = abv.trim() ? parseFloat(abv) : undefined;

    if (ageNum !== undefined && (isNaN(ageNum) || ageNum < 1 || ageNum > 99)) {
      Alert.alert("Invalid age", "Age must be between 1 and 99");
      return;
    }
    if (abvNum !== undefined && (isNaN(abvNum) || abvNum <= 0 || abvNum > 100)) {
      Alert.alert("Invalid ABV", "ABV must be between 0 and 100");
      return;
    }

    setSaving(true);
    try {
      await updateWhisky(whiskyId, {
        name: name.trim(),
        distillery: distillery.trim(),
        region: region.trim() || undefined,
        country: country.trim() || undefined,
        age: ageNum,
        abv: abvNum,
        image_url: imageUrl.trim() || undefined,
      });
      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert("Save failed", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#C8963E" size="large" />
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.photoSection}>
            <Text style={fieldStyles.label}>Bottle Photo</Text>
            {imageUrl ? (
              <View style={styles.previewWrapper}>
                <Image source={{ uri: imageUrl }} style={styles.preview} resizeMode="contain" />
                <TouchableOpacity style={styles.retakeBtn} onPress={() => setCameraOpen(true)}>
                  <Text style={styles.retakeBtnText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setImageUrl("")}>
                  <Text style={styles.removeText}>Remove photo</Text>
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

          <Field label="Whisky Name *" value={name} onChange={setName} />
          <Field label="Distillery *" value={distillery} onChange={setDistillery} />
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
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
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
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "url";
  autoCapitalize?: "none" | "sentences" | "words";
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
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  centered: { flex: 1, backgroundColor: "#FAF8F5", alignItems: "center", justifyContent: "center" },
  content: { padding: 24, paddingBottom: 48 },

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
  preview: {
    width: 160,
    height: 280,
    borderRadius: 12,
    backgroundColor: "#F5EFE6",
  },
  retakeBtn: {
    borderWidth: 1,
    borderColor: "#C8963E",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retakeBtnText: { color: "#C8963E", fontSize: 14, fontWeight: "600" },
  removeText: { color: "#B8A090", fontSize: 13 },

  saveButton: {
    backgroundColor: "#C8963E",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    marginTop: 16,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
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
