import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const FEATURES = [
  { icon: "🥃", text: "Search or scan any whisky" },
  { icon: "📝", text: "Rate and log tasting notes" },
  { icon: "🍾", text: "Track your collection" },
];

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>D</Text>
        </View>
        <Text style={styles.title}>DramLog</Text>
        <Text style={styles.subtitle}>Your whisky journal</Text>

        <View style={styles.features}>
          {FEATURES.map(({ icon, text }) => (
            <View key={text} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{icon}</Text>
              <Text style={styles.featureText}>{text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={onDone}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5", alignItems: "center", justifyContent: "center" },
  inner: { alignItems: "center", paddingHorizontal: 40, width: "100%" },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#C8963E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  avatarText: { fontSize: 36, fontWeight: "800", color: "#fff" },
  title: { fontSize: 28, fontWeight: "800", color: "#C8963E", marginBottom: 6 },
  subtitle: { fontSize: 16, color: "#7A5C3E", marginBottom: 40 },
  features: { width: "100%", gap: 20, marginBottom: 48 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  featureIcon: { fontSize: 24, width: 36, textAlign: "center" },
  featureText: { fontSize: 16, color: "#1A0E00", fontWeight: "500", flex: 1 },
  button: {
    backgroundColor: "#C8963E",
    borderRadius: 12,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
