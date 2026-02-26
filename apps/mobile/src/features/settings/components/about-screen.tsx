import Constants from "expo-constants";
import {
  Cpu,
  ExternalLink,
  FileText,
  Github,
  Monitor,
  Scale,
} from "lucide-react-native";
import { Linking, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { getIsTauri } from "@/constants/layout";
import { SettingsRow } from "./settings-row";
import { SettingsDivider, SettingsSection } from "./settings-section";

const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";
const BUILD_NUMBER =
  (Constants.expoConfig?.extra as Record<string, unknown> | undefined)
    ?.buildNumber ?? "dev";

function getPlatformLabel(): string {
  if (Platform.OS === "web") {
    return getIsTauri() ? "Desktop (Tauri)" : "Web";
  }
  if (Platform.OS === "ios") {
    return "iOS";
  }
  if (Platform.OS === "android") {
    return "Android";
  }
  return Platform.OS;
}

function getRuntimeLabel(): string {
  if (Platform.OS === "web") {
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent;
      if (ua.includes("Mac OS")) {
        return "macOS";
      }
      if (ua.includes("Windows")) {
        return "Windows";
      }
      if (ua.includes("Linux")) {
        return "Linux";
      }
    }
    return "Browser";
  }
  return `${Platform.OS} ${Platform.Version}`;
}

export function AboutScreen() {
  const insets = useSafeAreaInsets();
  // biome-ignore lint/correctness/noUnusedVariables: destructured for side effect
  const { theme } = useUnistyles();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
      style={styles.container}
    >
      <View style={styles.brandSection}>
        <View style={styles.brandMark}>
          <Text style={styles.brandLetter}>O</Text>
        </View>
        <Text style={styles.brandName}>OpenPlane</Text>
        <Text style={styles.brandVersion}>v{APP_VERSION}</Text>
      </View>

      <SettingsSection title="App">
        <SettingsRow label="Version" type="info" value={APP_VERSION} />
        <SettingsDivider />
        <SettingsRow label="Build" type="info" value={String(BUILD_NUMBER)} />
      </SettingsSection>

      <SettingsSection title="System">
        <SettingsRow
          icon={<Monitor color="#6b7280" size={16} strokeWidth={2} />}
          label="Platform"
          type="info"
          value={getPlatformLabel()}
        />
        <SettingsDivider />
        <SettingsRow
          icon={<Cpu color="#6b7280" size={16} strokeWidth={2} />}
          label="Runtime"
          type="info"
          value={getRuntimeLabel()}
        />
      </SettingsSection>

      <SettingsSection title="Links">
        <SettingsRow
          icon={<ExternalLink color="#6b7280" size={16} strokeWidth={2} />}
          label="Website"
          // biome-ignore lint/complexity/noVoid: fire-and-forget async call
          onPress={() => void Linking.openURL("https://openplane.com")}
          type="action"
        />
        <SettingsDivider />
        <SettingsRow
          icon={<Github color="#6b7280" size={16} strokeWidth={2} />}
          label="GitHub"
          onPress={() =>
            // biome-ignore lint/complexity/noVoid: fire-and-forget async call
            void Linking.openURL("https://github.com/openplane/openplane")
          }
          type="action"
        />
        <SettingsDivider />
        <SettingsRow
          icon={<Scale color="#6b7280" size={16} strokeWidth={2} />}
          label="Open source licenses"
          onPress={() =>
            // biome-ignore lint/complexity/noVoid: fire-and-forget async call
            void Linking.openURL(
              "https://github.com/openplane/openplane/blob/main/LICENSE"
            )
          }
          type="action"
        />
      </SettingsSection>

      <SettingsSection title="Legal">
        <SettingsRow
          icon={<FileText color="#6b7280" size={16} strokeWidth={2} />}
          label="Privacy Policy"
          // biome-ignore lint/complexity/noVoid: fire-and-forget async call
          onPress={() => void Linking.openURL("https://openplane.com/privacy")}
          type="action"
        />
        <SettingsDivider />
        <SettingsRow
          icon={<FileText color="#6b7280" size={16} strokeWidth={2} />}
          label="Terms of Service"
          // biome-ignore lint/complexity/noVoid: fire-and-forget async call
          onPress={() => void Linking.openURL("https://openplane.com/terms")}
          type="action"
        />
      </SettingsSection>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with craft, not code.</Text>
      </View>
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
  brandSection: {
    alignItems: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[4],
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  brandLetter: {
    fontSize: 22,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.foreground,
  },
  brandName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground,
  },
  brandVersion: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
  },
  footer: {
    alignItems: "center",
    paddingVertical: theme.spacing[4],
  },
  footerText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
  },
}));
