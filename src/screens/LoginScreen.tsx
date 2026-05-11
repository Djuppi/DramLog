import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { AuthStackParamList } from "../navigation/types";
import {
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID,
} from "../config/oauth";

WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { signIn, signInWithApple, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [, googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.params.id_token;
      if (idToken) {
        setGoogleLoading(true);
        signInWithGoogle(idToken)
          .catch((e: unknown) => Alert.alert("Google Sign-In failed", (e as Error).message))
          .finally(() => setGoogleLoading(false));
      }
    } else if (googleResponse?.type === "error") {
      Alert.alert("Google Sign-In failed", googleResponse.error?.message ?? "Unknown error");
    }
  }, [googleResponse]);

  async function handleSignIn() {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: unknown) {
      Alert.alert("Sign in failed", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleSignIn() {
    setAppleLoading(true);
    try {
      await signInWithApple();
    } catch (e: unknown) {
      const err = e as Error;
      if (!err.message.includes("canceled")) {
        Alert.alert("Apple Sign-In failed", err.message);
      }
    } finally {
      setAppleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>DramLog</Text>
        <Text style={styles.tagline}>Your whisky journal</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#B8A090"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#B8A090"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.forgotLink}
          onPress={() => navigation.navigate("ForgotPassword")}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {Platform.OS === "ios" && (
          appleLoading ? (
            <View style={styles.socialLoadingContainer}>
              <ActivityIndicator color="#1A0E00" />
            </View>
          ) : (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )
        )}

        {Platform.OS === "android" && (
          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
            onPress={() => googlePromptAsync()}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#1A0E00" />
            ) : (
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate("SignUp")}
        >
          <Text style={styles.linkText}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logo: {
    fontSize: 40,
    fontWeight: "800",
    color: "#C8963E",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: "#7A5C3E",
    textAlign: "center",
    marginBottom: 48,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E8DDD0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1A0E00",
    marginBottom: 16,
  },
  forgotLink: { alignSelf: "flex-end", marginBottom: 8 },
  forgotText: { color: "#C8963E", fontSize: 13 },
  button: {
    backgroundColor: "#C8963E",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E8DDD0" },
  dividerText: { color: "#B8A090", fontSize: 13 },
  appleButton: { width: "100%", height: 50 },
  socialLoadingContainer: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8DDD0",
  },
  googleButtonText: { color: "#1A0E00", fontSize: 16, fontWeight: "600" },
  linkButton: { marginTop: 24, alignItems: "center" },
  linkText: { color: "#7A5C3E", fontSize: 14 },
});
