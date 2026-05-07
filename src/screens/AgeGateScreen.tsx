import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";

interface Props {
  onVerified: () => void;
}

type State = "gate" | "underage";

export default function AgeGateScreen({ onVerified }: Props) {
  const [day,   setDay]   = useState("");
  const [month, setMonth] = useState("");
  const [year,  setYear]  = useState("");
  const [state, setState] = useState<State>("gate");
  const [error, setError] = useState("");

  const monthRef = useRef<TextInput>(null);
  const yearRef  = useRef<TextInput>(null);

  function handleDay(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 2);
    setDay(digits);
    setError("");
    if (digits.length === 2) monthRef.current?.focus();
  }

  function handleMonth(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 2);
    setMonth(digits);
    setError("");
    if (digits.length === 2) yearRef.current?.focus();
  }

  function handleYear(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    setYear(digits);
    setError("");
  }

  function handleContinue() {
    const d = parseInt(day,   10);
    const m = parseInt(month, 10);
    const y = parseInt(year,  10);

    if (!day || !month || !year || year.length < 4) {
      setError("Please enter your full date of birth.");
      return;
    }
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900) {
      setError("Please enter a valid date.");
      return;
    }

    const dob  = new Date(y, m - 1, d);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const beforeBirthday =
      today.getMonth() < dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
    if (beforeBirthday) age--;

    if (age < 18) {
      setState("underage");
      return;
    }

    onVerified();
  }

  const canContinue = day.length > 0 && month.length > 0 && year.length === 4;

  if (state === "underage") {
    return (
      <View style={styles.container}>
        <Image source={require("../../assets/icon.png")} style={styles.logo} />
        <Text style={styles.sorryTitle}>Sorry</Text>
        <Text style={styles.sorryBody}>
          You must be 18 or older to use DramLog.
        </Text>
        <TouchableOpacity onPress={() => setState("gate")} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Image source={require("../../assets/icon.png")} style={styles.logo} />

        <Text style={styles.appName}>DramLog</Text>
        <Text style={styles.tagline}>Your whisky journey</Text>

        <View style={styles.divider} />

        <Text style={styles.heading}>Age verification</Text>
        <Text style={styles.body}>
          DramLog contains alcohol-related content.{"\n"}
          You must be 18 or older to continue.
        </Text>

        <Text style={styles.dobLabel}>Date of birth</Text>
        <View style={styles.dobRow}>
          <View style={styles.dobField}>
            <TextInput
              style={styles.dobInput}
              value={day}
              onChangeText={handleDay}
              placeholder="DD"
              placeholderTextColor="#B8A090"
              keyboardType="number-pad"
              maxLength={2}
              returnKeyType="next"
              onSubmitEditing={() => monthRef.current?.focus()}
            />
            <Text style={styles.dobFieldLabel}>Day</Text>
          </View>

          <Text style={styles.dobSep}>/</Text>

          <View style={styles.dobField}>
            <TextInput
              ref={monthRef}
              style={styles.dobInput}
              value={month}
              onChangeText={handleMonth}
              placeholder="MM"
              placeholderTextColor="#B8A090"
              keyboardType="number-pad"
              maxLength={2}
              returnKeyType="next"
              onSubmitEditing={() => yearRef.current?.focus()}
            />
            <Text style={styles.dobFieldLabel}>Month</Text>
          </View>

          <Text style={styles.dobSep}>/</Text>

          <View style={[styles.dobField, styles.dobFieldYear]}>
            <TextInput
              ref={yearRef}
              style={styles.dobInput}
              value={year}
              onChangeText={handleYear}
              placeholder="YYYY"
              placeholderTextColor="#B8A090"
              keyboardType="number-pad"
              maxLength={4}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
            <Text style={styles.dobFieldLabel}>Year</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, !canContinue && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By continuing you confirm you are of legal drinking age in your country.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    paddingBottom: 48,
  },

  logo:    { width: 120, height: 120, borderRadius: 24, marginBottom: 16 },
  appName: { color: "#1A0E00", fontSize: 32, fontWeight: "700", letterSpacing: 1 },
  tagline: { color: "#c8963e", fontSize: 15, marginBottom: 28, opacity: 0.85 },

  divider: {
    width: "60%",
    height: 1,
    backgroundColor: "#EDE6DC",
    marginBottom: 28,
  },

  heading: {
    color: "#c8963e",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  body: {
    color: "#7A5C3E",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },

  dobLabel: {
    color: "#7A5C3E",
    fontSize: 13,
    fontWeight: "600",
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  dobRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    width: "100%",
  },
  dobField: { alignItems: "center", flex: 2 },
  dobFieldYear: { flex: 3 },
  dobInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DDD0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    color: "#1A0E00",
    textAlign: "center",
    width: "100%",
  },
  dobFieldLabel: { color: "#B8A090", fontSize: 11, marginTop: 6 },
  dobSep: {
    color: "#B8A090",
    fontSize: 24,
    paddingTop: 12,
    paddingHorizontal: 6,
  },

  error: {
    color: "#e05050",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },

  btn: {
    backgroundColor: "#c8963e",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 8,
    marginBottom: 24,
    width: "100%",
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  disclaimer: {
    color: "#E8DDD0",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  // underage
  sorryTitle: {
    color: "#1A0E00",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 12,
  },
  sorryBody: {
    color: "#7A5C3E",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  backBtn: { padding: 12 },
  backBtnText: { color: "#c8963e", fontSize: 15 },
});
