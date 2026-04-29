import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { lookupBarcode } from "../api/barcodes";
import { findWhiskyMatch } from "../api/whiskies";
import BottleCamera from "../components/BottleCamera";
import { ScanStackParamList, WhiskyPrefill } from "../navigation/types";

type Props = NativeStackScreenProps<ScanStackParamList, "Scanner">;

// EAN-13 check digit validation on device before calling the edge function
function isValidEan(barcode: string): boolean {
  if (!/^\d{8}$|^\d{12,13}$/.test(barcode)) return false;
  if (barcode.length !== 13 && barcode.length !== 12) return true;
  const digits = barcode.padStart(13, "0").split("").map(Number);
  const check = digits
    .slice(0, 12)
    .reduce((sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (check % 10)) % 10 === digits[12];
}

export default function ScannerScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [labelCameraOpen, setLabelCameraOpen] = useState(false);
  const [labelLoading, setLabelLoading] = useState(false);
  const lastScanned = useRef<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-enable scanning when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      setScanning(true);
      lastScanned.current = null;
      return () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
      };
    }, [])
  );

  async function handleBarcodeScanned({ type, data }: BarcodeScanningResult) {
    if (!scanning || loading) return;
    if (data === lastScanned.current) return;

    // Require two consecutive identical reads for confidence
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      if (!isValidEan(data)) return;

      lastScanned.current = data;
      setScanning(false);
      setLoading(true);

      try {
        const result = await lookupBarcode(data, type);

        if (result.found && result.whisky) {
          navigation.navigate("WhiskyDetail", { whiskyId: result.whisky.id });
        } else {
          Alert.alert(
            "Whisky Not Found",
            "We couldn't identify this barcode. Would you like to add it manually?",
            [
              { text: "Try Again", onPress: () => setScanning(true) },
              {
                text: "Add Manually",
                onPress: () => navigation.navigate("ManualEntry", { barcode: data }),
              },
            ]
          );
        }
      } catch (e: unknown) {
        Alert.alert("Error", (e as Error).message, [
          { text: "Retry", onPress: () => setScanning(true) },
        ]);
      } finally {
        setLoading(false);
      }
    }, 500);
  }

  async function handleLabelCaptured(base64: string) {
    setLabelLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<WhiskyPrefill>(
        "identify-bottle",
        { body: { imageBase64: base64 } }
      );

      if (error) {
        let msg = error.message;
        try {
          if ("context" in error) {
            const body = await (error as any).context.json();
            msg = body?.error || msg;
          }
        } catch {}
        throw new Error(msg);
      }

      const prefill = data ?? {};

      // Check if this whisky already exists in the database
      if (prefill.name && prefill.distillery) {
        const existing = await findWhiskyMatch(prefill.name, prefill.distillery);
        if (existing) {
          navigation.navigate("WhiskyDetail", { whiskyId: existing.id });
          return;
        }
      }

      navigation.navigate("ManualEntry", { prefill });
    } catch (e: unknown) {
      Alert.alert(
        "Couldn't read label",
        (e as Error).message + "\n\nYou can add the whisky manually.",
        [
          { text: "Add Manually", onPress: () => navigation.navigate("ManualEntry", {}) },
          { text: "Try Again", style: "cancel" },
        ]
      );
    } finally {
      setLabelLoading(false);
    }
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera access is needed to scan barcodes.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"],
        }}
        onBarcodeScanned={scanning ? handleBarcodeScanned : undefined}
      />

      {/* Viewfinder overlay */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          {loading ? (
            <ActivityIndicator color="#c8963e" size="large" />
          ) : (
            <Text style={styles.hint}>Point at the barcode on the bottle</Text>
          )}
        </View>
      </View>

      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => setLabelCameraOpen(true)}
        >
          <Text style={styles.bottomButtonText}>Scan Label</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => navigation.navigate("ManualEntry", {})}
        >
          <Text style={styles.bottomButtonText}>Add manually</Text>
        </TouchableOpacity>
      </View>

      {labelLoading && (
        <View style={styles.labelLoadingOverlay}>
          <ActivityIndicator color="#c8963e" size="large" />
          <Text style={styles.labelLoadingText}>Reading label…</Text>
        </View>
      )}

      <BottleCamera
        visible={labelCameraOpen}
        onCaptureRaw={(base64) => {
          setLabelCameraOpen(false);
          handleLabelCaptured(base64);
        }}
        onCapture={() => {}}
        onCancel={() => setLabelCameraOpen(false)}
        hintText="Point camera at the bottle label"
      />
    </View>
  );
}

const VIEWFINDER_SIZE = 260;
const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#1a0e00",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  permissionText: {
    color: "#f5e6d0",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#c8963e",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  overlay: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  overlayMiddle: { flexDirection: "row", height: VIEWFINDER_SIZE },
  overlaySide: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  overlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    paddingTop: 24,
  },
  hint: { color: "#f5e6d0", fontSize: 14, opacity: 0.8 },

  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: "#c8963e",
  },
  topLeft: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },

  bottomRow: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  bottomButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#c8963e",
  },
  bottomButtonText: { color: "#c8963e", fontSize: 15, fontWeight: "600" },

  labelLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  labelLoadingText: { color: "#f5e6d0", fontSize: 16, fontWeight: "600" },
});
