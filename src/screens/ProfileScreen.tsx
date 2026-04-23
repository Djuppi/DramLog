import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { getMyStats } from "../api/checkins";
import { isAdmin } from "../api/admin";
import { ProfileStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<ProfileStackParamList, "Profile">;

export default function ProfileScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<{
    totalCheckins: number;
    uniqueWhiskies: number;
    avgRating: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([getMyStats(), isAdmin()])
        .then(([s, adminFlag]) => {
          setStats(s);
          setAdmin(adminFlag);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (e: unknown) {
            Alert.alert("Error", (e as Error).message);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user?.email?.[0]?.toUpperCase() ?? "?"}
        </Text>
      </View>
      <Text style={styles.email}>{user?.email}</Text>

      {loading ? (
        <ActivityIndicator color="#c8963e" style={styles.loader} />
      ) : stats ? (
        <View style={styles.statsGrid}>
          <StatCard label="Total Drams" value={stats.totalCheckins.toString()} />
          <StatCard label="Unique Whiskies" value={stats.uniqueWhiskies.toString()} />
          <StatCard
            label="Avg Rating"
            value={stats.avgRating !== null ? stats.avgRating.toFixed(1) : "—"}
          />
        </View>
      ) : null}

      {admin && (
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => navigation.navigate("Admin")}
        >
          <Text style={styles.adminButtonText}>Admin Panel</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a0e00" },
  content: { alignItems: "center", padding: 32 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#c8963e",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 36, fontWeight: "800", color: "#fff" },
  email: { color: "#a0856a", fontSize: 15, marginBottom: 32 },
  loader: { marginVertical: 24 },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 40,
    width: "100%",
  },
  adminButton: {
    backgroundColor: "#c8963e",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginBottom: 12,
  },
  adminButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  signOutButton: {
    borderWidth: 1,
    borderColor: "#c8963e",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  signOutText: { color: "#c8963e", fontSize: 16, fontWeight: "600" },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#2a1c0c",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  value: { fontSize: 24, fontWeight: "800", color: "#c8963e" },
  label: { fontSize: 11, color: "#6a5040", marginTop: 4, textAlign: "center" },
});
