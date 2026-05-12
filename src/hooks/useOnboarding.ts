import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@dramlog:onboarding_done";

export function useOnboarding() {
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((val) => setOnboardingDone(val === "true"));
  }, []);

  async function completeOnboarding() {
    await AsyncStorage.setItem(KEY, "true");
    setOnboardingDone(true);
  }

  return { onboardingDone, completeOnboarding };
}
