import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import AuthNavigator from "./src/navigation/AuthNavigator";
import AgeGateScreen from "./src/screens/AgeGateScreen";
import { useAgeGate } from "./src/hooks/useAgeGate";

function RootNavigator() {
  const { session, loading } = useAuth();
  const { verified, verify } = useAgeGate();

  if (loading || verified === null) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FAF8F5", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#c8963e" size="large" />
      </View>
    );
  }

  if (!verified) {
    return <AgeGateScreen onVerified={verify} />;
  }

  return session ? <AppNavigator /> : <AuthNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
