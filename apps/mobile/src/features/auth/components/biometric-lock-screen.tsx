import { Fingerprint, ScanFace } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { useBiometricLock } from "../hooks/use-biometric-lock";

export function BiometricLockScreen() {
  const insets = useSafeAreaInsets();
  const { authenticate, biometricLabel, biometricType } = useBiometricLock();

  const BiometricIcon = biometricType === "facial" ? ScanFace : Fingerprint;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Pressable
          onPress={authenticate}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
        >
          <BiometricIcon color="#6b7280" size={48} strokeWidth={1.5} />
        </Pressable>

        <Text style={styles.title}>Locked</Text>
        <Text muted style={styles.subtitle}>
          Tap to unlock with {biometricLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[4],
    paddingHorizontal: theme.spacing[8],
  },
  iconButton: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing[4],
  },
  iconButtonPressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
}));
