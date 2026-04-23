import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface Props {
  value: number;
  onChange: (v: number) => void;
}

// Tap-based 0–10 rating in 0.5 steps, displayed as filled drams
export default function RatingSlider({ value, onChange }: Props) {
  const steps = Array.from({ length: 20 }, (_, i) => (i + 1) * 0.5); // 0.5 … 10.0

  return (
    <View>
      <Text style={styles.label}>
        Rating: <Text style={styles.value}>{value > 0 ? value.toFixed(1) : "—"} / 10</Text>
      </Text>
      <View style={styles.track}>
        {steps.map((step) => (
          <TouchableOpacity
            key={step}
            style={[styles.segment, step <= value && styles.segmentFilled]}
            onPress={() => onChange(step === value ? 0 : step)}
            activeOpacity={0.7}
          />
        ))}
      </View>
      <View style={styles.labels}>
        <Text style={styles.trackLabel}>0</Text>
        <Text style={styles.trackLabel}>5</Text>
        <Text style={styles.trackLabel}>10</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: "#a0856a", fontSize: 14, marginBottom: 12 },
  value: { color: "#c8963e", fontWeight: "700" },
  track: {
    flexDirection: "row",
    height: 36,
    borderRadius: 8,
    overflow: "hidden",
    gap: 2,
  },
  segment: {
    flex: 1,
    backgroundColor: "#2a1c0c",
    borderRadius: 3,
  },
  segmentFilled: { backgroundColor: "#c8963e" },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  trackLabel: { color: "#6a5040", fontSize: 12 },
});
