import { Monitor, Moon, Sun } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";
import { useAppSettings } from "@/hooks/use-settings";
import type { ThemeMode } from "../lib/settings-types";
import { SettingsRow } from "./settings-row";
import { SettingsSection } from "./settings-section";

const THEME_OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  Icon: typeof Sun;
}> = [
  { mode: "light", label: "Light", Icon: Sun },
  { mode: "dark", label: "Dark", Icon: Moon },
  { mode: "auto", label: "System", Icon: Monitor },
];

export function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useAppSettings();

  const handleThemeChange = (mode: ThemeMode) => {
    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void updateSettings({ theme: mode });
    if (mode === "auto") {
      UnistylesRuntime.setAdaptiveThemes(true);
    } else {
      UnistylesRuntime.setAdaptiveThemes(false);
      UnistylesRuntime.setTheme(mode);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
      style={styles.container}
    >
      <SettingsSection title="Theme">
        {THEME_OPTIONS.map(({ mode, label, Icon }, index) => (
          <View key={mode}>
            {index > 0 && <View style={styles.divider} />}
            <SettingsRow
              icon={<Icon color="#6b7280" size={16} strokeWidth={2} />}
              label={label}
              onPress={() => handleThemeChange(mode)}
              type="action"
            />
            {settings.theme === mode && (
              <View style={styles.selectedIndicator} />
            )}
          </View>
        ))}
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
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  selectedIndicator: {
    position: "absolute",
    right: 16,
    top: "50%",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    transform: [{ translateY: -4 }],
  },
}));
