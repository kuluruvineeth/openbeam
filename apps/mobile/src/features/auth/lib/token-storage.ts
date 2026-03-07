import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_TOKEN_KEY = "openbeam-session-token";
const BIOMETRIC_ENABLED_KEY = "openbeam-biometric-enabled";

const isSecureStoreAvailable = Platform.OS !== "web";

// biome-ignore lint/suspicious/useAwait: async signature required by interface
export async function getSessionToken(): Promise<string | null> {
  if (isSecureStoreAvailable) {
    return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  }
  return AsyncStorage.getItem(SESSION_TOKEN_KEY);
}

export async function setSessionToken(token: string): Promise<void> {
  if (isSecureStoreAvailable) {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return;
  }
  await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
}

export async function deleteSessionToken(): Promise<void> {
  if (isSecureStoreAvailable) {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    return;
  }
  await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
}

export async function getBiometricEnabled(): Promise<boolean> {
  if (isSecureStoreAvailable) {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === "true";
  }
  const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
  return value === "true";
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  const value = enabled ? "true" : "false";
  if (isSecureStoreAvailable) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, value);
    return;
  }
  await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, value);
}
