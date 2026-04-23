import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createCheckin, updateCheckin } from "../api/checkins";
import RatingSlider from "../components/RatingSlider";
import { ServingStyle } from "../types/database";

type Props = NativeStackScreenProps<
  import("../navigation/types").ScanStackParamList,
  "CheckIn"
>;

const SERVING_STYLES: { value: ServingStyle; label: string }[] = [
  { value: "neat", label: "Neat" },
  { value: "rocks", label: "On the Rocks" },
  { value: "water", label: "With Water" },
  { value: "cocktail", label: "Cocktail" },
  { value: "other", label: "Other" },
];

export default function CheckInScreen({ route, navigation }: any) {
  const { whisky, existingCheckinId } = route.params as {
    whisky: import("../types/database").Whisky;
    existingCheckinId?: string;
  };

  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [serving, setServing] = useState<ServingStyle | undefined>(undefined);
  const [venue, setVenue] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      const input = {
        whisky_id: whisky.id,
        rating: rating > 0 ? rating : undefined,
        notes: notes.trim() || undefined,
        serving_style: serving,
        venue: venue.trim() || undefined,
      };

      if (existingCheckinId) {
        await updateCheckin(existingCheckinId, input);
      } else {
        await createCheckin(input);
      }

      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.whiskyHeader}>
          <Text style={styles.whiskyName}>{whisky.name}</Text>
          <Text style={styles.whiskyDistillery}>{whisky.distillery}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rating</Text>
          <RatingSlider value={rating} onChange={setRating} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Serving Style</Text>
          <View style={styles.servingRow}>
            {SERVING_STYLES.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[
                  styles.servingChip,
                  serving === s.value && styles.servingChipActive,
                ]}
                onPress={() => setServing(serving === s.value ? undefined : s.value)}
              >
                <Text
                  style={[
                    styles.servingChipText,
                    serving === s.value && styles.servingChipTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasting Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Describe your dram..."
            placeholderTextColor="#6a5040"
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            maxLength={2000}
          />
          <Text style={styles.charCount}>{notes.length}/2000</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Venue (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Where are you enjoying this?"
            placeholderTextColor="#6a5040"
            value={venue}
            onChangeText={setVenue}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {existingCheckinId ? "Update Check-in" : "Log Check-in"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a0e00" },
  content: { padding: 24, paddingBottom: 48 },

  whiskyHeader: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#2a1c0c",
  },
  whiskyName: { fontSize: 22, fontWeight: "800", color: "#f5e6d0" },
  whiskyDistillery: { fontSize: 16, color: "#c8963e", marginTop: 4 },

  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f5e6d0",
    marginBottom: 12,
  },

  servingRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  servingChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#4a3020",
    backgroundColor: "#2a1c0c",
  },
  servingChipActive: { backgroundColor: "#c8963e", borderColor: "#c8963e" },
  servingChipText: { color: "#a0856a", fontSize: 14 },
  servingChipTextActive: { color: "#fff", fontWeight: "600" },

  notesInput: {
    backgroundColor: "#2a1c0c",
    borderColor: "#4a3020",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#f5e6d0",
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: { color: "#6a5040", fontSize: 12, marginTop: 4, textAlign: "right" },

  input: {
    backgroundColor: "#2a1c0c",
    borderColor: "#4a3020",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#f5e6d0",
  },

  submitButton: {
    backgroundColor: "#c8963e",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
