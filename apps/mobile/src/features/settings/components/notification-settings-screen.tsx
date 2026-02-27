import { useState } from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import type { NotificationPreference } from "../lib/settings-types";
import { SettingsRow } from "./settings-row";
import { SettingsDivider, SettingsSection } from "./settings-section";

export function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState<NotificationPreference>({
    syncCompleted: true,
    syncFailed: true,
    agentUpdates: true,
    mentions: true,
  });

  const toggle = (key: keyof NotificationPreference) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
      style={styles.container}
    >
      <SettingsSection title="Sync">
        <SettingsRow
          label="Sync completed"
          onValueChange={() => toggle("syncCompleted")}
          sublabel="Notify when a connector sync finishes"
          type="toggle"
          value={prefs.syncCompleted}
        />
        <SettingsDivider />
        <SettingsRow
          label="Sync failed"
          onValueChange={() => toggle("syncFailed")}
          sublabel="Notify when a connector sync fails"
          type="toggle"
          value={prefs.syncFailed}
        />
      </SettingsSection>

      <SettingsSection title="Agents">
        <SettingsRow
          label="Agent updates"
          onValueChange={() => toggle("agentUpdates")}
          sublabel="Notify when agents complete tasks"
          type="toggle"
          value={prefs.agentUpdates}
        />
      </SettingsSection>

      <SettingsSection title="Activity">
        <SettingsRow
          label="Mentions"
          onValueChange={() => toggle("mentions")}
          sublabel="Notify when you are mentioned"
          type="toggle"
          value={prefs.mentions}
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
