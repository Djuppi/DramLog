import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@dramlog:age_verified";

export function useAgeGate() {
  const [verified, setVerified] = useState<boolean | null>(null); // null = still loading

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((val) => setVerified(val === "true"));
  }, []);

  async function verify() {
    await AsyncStorage.setItem(KEY, "true");
    setVerified(true);
  }

  return { verified, verify };
}
