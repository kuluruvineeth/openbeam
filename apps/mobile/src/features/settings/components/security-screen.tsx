import { Fingerprint, LogOut } from "lucide-react-native";
import { Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useBiometricLock } from "@/features/auth/hooks/use-biometric-lock";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import { SettingsRow } from "./settings-row";
import { SettingsSection } from "./settings-section";

export function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { biometricLabel, isAvailable, enable, disable } = useBiometricLock();
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      await enable();
    } else {
      await disable();
    }
  };

  const handleSignOutAllDevices = () => {
    Alert.alert(
      "Sign out everywhere",
      "This will sign you out of all devices. You will need to sign in again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          // biome-ignore lint/complexity/noVoid: fire-and-forget async call
          onPress: () => void signOut(),
        },
      ]
    );
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
      style={styles.container}
    >
      {isAvailable && (
        <SettingsSection title="Biometric Lock">
          <SettingsRow
            icon={<Fingerprint color="#6b7280" size={16} strokeWidth={2} />}
            label={biometricLabel}
            // biome-ignore lint/complexity/noVoid: fire-and-forget async call
            onValueChange={(v) => void handleToggleBiometric(v)}
            sublabel="Require biometric to open the app"
            type="toggle"
            value={biometricEnabled}
          />
        </SettingsSection>
      )}

      <SettingsSection title="Sessions">
        <SettingsRow
          destructive
          icon={<LogOut color="#6b7280" size={16} strokeWidth={2} />}
          label="Sign out of all devices"
          onPress={handleSignOutAllDevices}
          sublabel="Invalidate all active sessions"
          type="action"
        />
      </SettingsSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing[4],
    gap: theme.spacing[6],
  },
}));
