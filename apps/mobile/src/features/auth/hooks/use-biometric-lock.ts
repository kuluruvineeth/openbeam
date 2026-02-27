import * as LocalAuthentication from "expo-local-authentication";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import type { BiometricType } from "../lib/auth-types";
import { setBiometricEnabled as persistBiometricEnabled } from "../lib/token-storage";
import { useAuthStore } from "../stores/auth-store";

export function useBiometricLock() {
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const biometricUnlocked = useAuthStore((s) => s.biometricUnlocked);
  const setBiometricEnabled = useAuthStore((s) => s.setBiometricEnabled);
  const setBiometricUnlocked = useAuthStore((s) => s.setBiometricUnlocked);
  const [biometricType, setBiometricType] = useState<BiometricType>("none");
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    async function check() {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsAvailable(compatible && enrolled);

      if (compatible && enrolled) {
        const types =
          await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (
          types.includes(
            LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
          )
        ) {
          setBiometricType("facial");
        } else if (
          types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ) {
          setBiometricType("fingerprint");
        } else if (
          types.includes(LocalAuthentication.AuthenticationType.IRIS)
        ) {
          setBiometricType("iris");
        }
      }
    }

    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void check();
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") {
      setBiometricUnlocked(true);
      return true;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock OpenPlane",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    if (result.success) {
      setBiometricUnlocked(true);
    }
    return result.success;
  }, [setBiometricUnlocked]);

  const enable = useCallback(async (): Promise<boolean> => {
    const success = await authenticate();
    if (success) {
      setBiometricEnabled(true);
      await persistBiometricEnabled(true);
    }
    return success;
  }, [authenticate, setBiometricEnabled]);

  const disable = useCallback(async () => {
    setBiometricEnabled(false);
    setBiometricUnlocked(true);
    await persistBiometricEnabled(false);
  }, [setBiometricEnabled, setBiometricUnlocked]);

  const biometricLabel =
    biometricType === "facial"
      ? "Face ID"
      : // biome-ignore lint/style/noNestedTernary: readable inline conditional
        biometricType === "fingerprint"
        ? "Touch ID"
        : "Biometric";

  const needsUnlock = biometricEnabled && !biometricUnlocked;

  return {
    isAvailable,
    biometricEnabled,
    biometricUnlocked,
    biometricType,
    biometricLabel,
    needsUnlock,
    authenticate,
    enable,
    disable,
  };
}
