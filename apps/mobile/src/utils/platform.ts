import { Platform } from "react-native";
import { getIsTauri, getIsTauriMac } from "@/constants/layout";

export const IS_WEB = Platform.OS === "web";
export const IS_IOS = Platform.OS === "ios";
export const IS_ANDROID = Platform.OS === "android";
export const IS_NATIVE = IS_IOS || IS_ANDROID;

export { getIsTauri, getIsTauriMac };

export function isDesktop(): boolean {
  return getIsTauri();
}

export function isMobile(): boolean {
  return IS_NATIVE || (!getIsTauri() && IS_WEB);
}

export function supportsWebAudio(): boolean {
  if (!IS_WEB) {
    return false;
  }
  return (
    typeof AudioContext !== "undefined" ||
    typeof (globalThis as Record<string, unknown>).webkitAudioContext !==
      "undefined"
  );
}

export function supportsNativeAudio(): boolean {
  return IS_NATIVE;
}
