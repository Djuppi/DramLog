import React, { useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
  Image,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import Svg, { Path, Defs, Mask, Rect } from "react-native-svg";
import { supabase } from "../lib/supabase";

interface Props {
  visible: boolean;
  onCapture: (imageUrl: string) => void;
  onCancel: () => void;
}

type Stage = "camera" | "processing" | "preview";

// ─── Bottle path helpers ──────────────────────────────────────────────────────

function buildOverlayPath(W: number, H: number): string {
  const { bottle } = getBottleDimensions(W, H);
  // Screen rect + bottle outline combined — evenodd fill rule punches the bottle out
  return `M0,0 L${W},0 L${W},${H} L0,${H} Z ${bottle}`;
}

function buildOutlinePath(W: number, H: number): string {
  return getBottleDimensions(W, H).bottle;
}

function getBottleDimensions(W: number, H: number) {
  const cx = W / 2;
  const bodyW = W * 0.38;
  const totalH = H * 0.63;
  // Offset upward slightly so the capture button doesn't overlap the body
  const top = (H - totalH) / 2 - 24;
  const bottom = top + totalH;

  const capW = bodyW * 0.26;
  const neckW = bodyW * 0.37;
  const capH = totalH * 0.038;
  const neckH = totalH * 0.21;
  const shoulderH = totalH * 0.088;

  const capBottom = top + capH;
  const neckBottom = capBottom + neckH;
  const shoulderBottom = neckBottom + shoulderH;

  // Quadratic bezier shoulders: control point pulls outward at neck-bottom y
  const bottle = [
    `M${cx - capW / 2},${top}`,
    `L${cx + capW / 2},${top}`,
    `L${cx + capW / 2},${capBottom}`,
    `L${cx + neckW / 2},${capBottom}`,
    `L${cx + neckW / 2},${neckBottom}`,
    `Q${cx + bodyW / 2},${neckBottom} ${cx + bodyW / 2},${shoulderBottom}`,
    `L${cx + bodyW / 2},${bottom}`,
    `L${cx - bodyW / 2},${bottom}`,
    `L${cx - bodyW / 2},${shoulderBottom}`,
    `Q${cx - bodyW / 2},${neckBottom} ${cx - neckW / 2},${neckBottom}`,
    `L${cx - neckW / 2},${capBottom}`,
    `L${cx - capW / 2},${capBottom}`,
    `Z`,
  ].join(" ");

  return { cx, bodyW, totalH, top, bottom, capBottom, neckBottom, shoulderBottom, bottle };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BottleCamera({ visible, onCapture, onCancel }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>("camera");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  function handleCancel() {
    setStage("camera");
    setCapturedUri(null);
    onCancel();
  }

  async function handleCapture() {
    if (!cameraRef.current) return;
    setStage("processing");

    let base64: string | undefined;
    let uri: string | undefined;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.75,
        base64: true,
        skipProcessing: false,
      });
      base64 = photo?.base64;
      uri = photo?.uri;
    } catch (e: unknown) {
      Alert.alert("Capture failed", (e as Error).message);
      setStage("camera");
      return;
    }

    if (!base64 || !uri) {
      Alert.alert("Error", "Failed to capture photo");
      setStage("camera");
      return;
    }

    setCapturedUri(uri);
    setStage("preview"); // show the captured frame while API processes

    try {
      const { data, error } = await supabase.functions.invoke<{ url: string }>(
        "remove-background",
        { body: { imageBase64: base64 } }
      );

      if (error || !data?.url) throw new Error(error?.message ?? "No URL returned");

      onCapture(data.url);
      setStage("camera");
      setCapturedUri(null);
    } catch (e: unknown) {
      Alert.alert(
        "Background removal failed",
        `${(e as Error).message}\n\nThe original photo will be used instead.`,
        [
          {
            text: "Use original",
            onPress: async () => {
              // Fall back: upload the original JPEG directly
              if (!base64) { setStage("camera"); return; }
              try {
                const bytes = Uint8Array.from(atob(base64!), (c) => c.charCodeAt(0));
                const filename = `bottles/${crypto.randomUUID()}.jpg`;
                const { error: uploadErr } = await supabase.storage
                  .from("whisky-images")
                  .upload(filename, bytes, { contentType: "image/jpeg" });
                if (uploadErr) throw uploadErr;
                const { data: { publicUrl } } = supabase.storage
                  .from("whisky-images")
                  .getPublicUrl(filename);
                onCapture(publicUrl);
              } catch {
                // Give up — user can enter URL manually
              } finally {
                setStage("camera");
                setCapturedUri(null);
              }
            },
          },
          { text: "Retake", onPress: () => { setStage("camera"); setCapturedUri(null); } },
        ]
      );
    }
  }

  if (!visible) return null;

  // ── Permission gate ──────────────────────────────────────────────────────
  if (!permission?.granted) {
    return (
      <Modal visible animationType="slide" onRequestClose={handleCancel}>
        <View style={styles.permContainer}>
          <Text style={styles.permText}>Camera access needed to photograph the bottle.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelLink} onPress={handleCancel}>
            <Text style={styles.cancelLinkText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  // ── Processing / preview overlay ─────────────────────────────────────────
  if (stage === "preview" && capturedUri) {
    return (
      <Modal visible animationType="fade" onRequestClose={handleCancel}>
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={styles.processingOverlay}>
            <ActivityIndicator color="#c8963e" size="large" />
            <Text style={styles.processingText}>Removing background…</Text>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Camera view ───────────────────────────────────────────────────────────
  return (
    <Modal visible animationType="slide" onRequestClose={handleCancel}>
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={"back" as CameraType}
        />

        {/* Dark overlay with bottle-shaped transparent window */}
        <Svg
          width={W}
          height={H}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {/* Overlay: screen rect with bottle punched out via evenodd */}
          <Path
            d={buildOverlayPath(W, H)}
            fill="rgba(0,0,0,0.62)"
            fillRule="evenodd"
          />
          {/* Amber bottle outline */}
          <Path
            d={buildOutlinePath(W, H)}
            fill="none"
            stroke="#c8963e"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        </Svg>

        {/* Hint label */}
        <View style={[styles.hintContainer, { top: H * 0.09 }]}>
          <Text style={styles.hint}>Fit the bottle inside the outline</Text>
        </View>

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleCancel} style={styles.topBarBtn}>
            <Text style={styles.topBarBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Capture button */}
        <View style={styles.captureRow}>
          <TouchableOpacity
            style={styles.captureBtn}
            onPress={handleCapture}
            disabled={stage === "processing"}
            activeOpacity={0.8}
          >
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  // Permission
  permContainer: {
    flex: 1,
    backgroundColor: "#1a0e00",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  permText: { color: "#f5e6d0", fontSize: 16, textAlign: "center", marginBottom: 24 },
  permBtn: {
    backgroundColor: "#c8963e",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginBottom: 16,
  },
  permBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelLink: { padding: 8 },
  cancelLinkText: { color: "#a0856a", fontSize: 15 },

  // Processing preview
  previewContainer: { flex: 1, backgroundColor: "#000" },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  processingText: { color: "#f5e6d0", fontSize: 17, fontWeight: "600" },

  // Camera UI
  hintContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hint: {
    color: "#f5e6d0",
    fontSize: 14,
    opacity: 0.85,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: "hidden",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 52,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  topBarBtn: {
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  topBarBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  captureRow: {
    position: "absolute",
    bottom: 52,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
  },
});
