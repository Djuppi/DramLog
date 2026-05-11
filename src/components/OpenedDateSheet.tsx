import React, { useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";

interface Props {
  visible: boolean;
  onConfirm: (date: Date, isToday: boolean) => void;
  onCancel: () => void;
}

const APPROX_OPTIONS: { label: string; daysAgo: number }[] = [
  { label: "Today", daysAgo: 0 },
  { label: "~1 week ago", daysAgo: 7 },
  { label: "~2 weeks ago", daysAgo: 14 },
  { label: "~1 month ago", daysAgo: 30 },
  { label: "~2 months ago", daysAgo: 61 },
  { label: "~3 months ago", daysAgo: 92 },
  { label: "~6 months ago", daysAgo: 183 },
  { label: "~1 year ago", daysAgo: 365 },
];

function daysAgoDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export default function OpenedDateSheet({ visible, onConfirm, onCancel }: Props) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [dateError, setDateError] = useState("");

  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  function resetForm() {
    setDay("");
    setMonth("");
    setYear("");
    setDateError("");
  }

  function handleApproxSelect(daysAgo: number) {
    onConfirm(daysAgoDate(daysAgo), daysAgo === 0);
    resetForm();
  }

  function handleExactSubmit() {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (!day || !month || !year || year.length < 4) {
      setDateError("Please enter a complete date.");
      return;
    }
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) {
      setDateError("Please enter a valid date.");
      return;
    }
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) {
      setDateError("Please enter a valid date.");
      return;
    }
    if (date > new Date()) {
      setDateError("Opening date can't be in the future.");
      return;
    }
    onConfirm(date, false);
    resetForm();
  }

  function handleCancel() {
    resetForm();
    onCancel();
  }

  const canSubmitExact = day.length > 0 && month.length > 0 && year.length === 4;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity style={styles.backdropArea} activeOpacity={1} onPress={handleCancel} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>When did you open this bottle?</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.badgeGrid}>
              {APPROX_OPTIONS.map(({ label, daysAgo }) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.badge, daysAgo === 0 && styles.badgeToday]}
                  onPress={() => handleApproxSelect(daysAgo)}
                >
                  <Text style={[styles.badgeText, daysAgo === 0 && styles.badgeTodayText]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.divider} />

            <Text style={styles.exactLabel}>Or enter exact date</Text>
            <View style={styles.dobRow}>
              <View style={styles.dobField}>
                <TextInput
                  style={styles.dobInput}
                  value={day}
                  onChangeText={(v) => {
                    const digits = v.replace(/\D/g, "").slice(0, 2);
                    setDay(digits);
                    setDateError("");
                    if (digits.length === 2) monthRef.current?.focus();
                  }}
                  placeholder="DD"
                  placeholderTextColor="#B8A090"
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.dobFieldLabel}>Day</Text>
              </View>
              <Text style={styles.dobSep}>/</Text>
              <View style={styles.dobField}>
                <TextInput
                  ref={monthRef}
                  style={styles.dobInput}
                  value={month}
                  onChangeText={(v) => {
                    const digits = v.replace(/\D/g, "").slice(0, 2);
                    setMonth(digits);
                    setDateError("");
                    if (digits.length === 2) yearRef.current?.focus();
                  }}
                  placeholder="MM"
                  placeholderTextColor="#B8A090"
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.dobFieldLabel}>Month</Text>
              </View>
              <Text style={styles.dobSep}>/</Text>
              <View style={[styles.dobField, styles.dobFieldYear]}>
                <TextInput
                  ref={yearRef}
                  style={styles.dobInput}
                  value={year}
                  onChangeText={(v) => {
                    const digits = v.replace(/\D/g, "").slice(0, 4);
                    setYear(digits);
                    setDateError("");
                  }}
                  placeholder="YYYY"
                  placeholderTextColor="#B8A090"
                  keyboardType="number-pad"
                  maxLength={4}
                  onSubmitEditing={handleExactSubmit}
                  returnKeyType="done"
                />
                <Text style={styles.dobFieldLabel}>Year</Text>
              </View>
            </View>

            {dateError ? <Text style={styles.error}>{dateError}</Text> : null}

            <TouchableOpacity
              style={[styles.saveBtn, !canSubmitExact && styles.saveBtnDisabled]}
              onPress={handleExactSubmit}
              disabled={!canSubmitExact}
            >
              <Text style={styles.saveBtnText}>Save Date</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelLink} onPress={handleCancel}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  backdropArea: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: "#FAF8F5",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E8DDD0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A0E00",
    marginBottom: 20,
  },

  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badge: {
    borderWidth: 1,
    borderColor: "#E8DDD0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
  },
  badgeToday: {
    backgroundColor: "#C8963E",
    borderColor: "#C8963E",
  },
  badgeText: { color: "#7A5C3E", fontSize: 14, fontWeight: "500" },
  badgeTodayText: { color: "#FFFFFF", fontWeight: "700" },

  divider: {
    height: 1,
    backgroundColor: "#EDE6DC",
    marginVertical: 20,
  },

  exactLabel: {
    color: "#7A5C3E",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  dobRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  dobField: { alignItems: "center", flex: 2 },
  dobFieldYear: { flex: 3 },
  dobInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DDD0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#1A0E00",
    textAlign: "center",
    width: "100%",
  },
  dobFieldLabel: { color: "#B8A090", fontSize: 11, marginTop: 5 },
  dobSep: {
    color: "#B8A090",
    fontSize: 22,
    paddingTop: 10,
    paddingHorizontal: 6,
  },

  error: {
    color: "#e05050",
    fontSize: 13,
    marginBottom: 12,
  },

  saveBtn: {
    backgroundColor: "#C8963E",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  cancelLink: { alignItems: "center", paddingVertical: 8 },
  cancelLinkText: { color: "#B8A090", fontSize: 15 },
});
