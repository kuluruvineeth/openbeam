import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { useAuth } from "../hooks/use-auth";
import { useBiometricLock } from "../hooks/use-biometric-lock";
import { useSessionMonitor } from "../hooks/use-session";
import { useAuthStore } from "../stores/auth-store";
import { BiometricLockScreen } from "./biometric-lock-screen";
import { OnboardingScreen } from "./onboarding-screen";
import { SignInScreen } from "./sign-in-screen";
import { TeamSelectScreen } from "./team-select-screen";

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const { initialize, completeOnboarding } = useAuth();
  const { needsUnlock } = useBiometricLock();
  useSessionMonitor();

  const authState = useAuthStore((s) => s.authState);
  const selectedTeamId = useAuthStore((s) => s.selectedTeamId);
  const teams = useAuthStore((s) => s.teams);
  const onboardingComplete = useAuthStore((s) => s.onboardingComplete);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (authState === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#6b7280" size="large" />
      </View>
    );
  }

  if (authState === "unauthenticated") {
    return <SignInScreen />;
  }

  if (needsUnlock) {
    return <BiometricLockScreen />;
  }

  if (!onboardingComplete) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  if (!selectedTeamId && teams.length > 0) {
    return <TeamSelectScreen />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create((theme) => ({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
}));
