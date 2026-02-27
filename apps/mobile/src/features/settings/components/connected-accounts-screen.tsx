import { Link, Unlink } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { SettingsRow } from "./settings-row";
import { SettingsSection } from "./settings-section";

const PROVIDERS = [
  { id: "google", label: "Google", connected: true },
  { id: "github", label: "GitHub", connected: false },
] as const;

export function ConnectedAccountsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
      style={styles.container}
    >
      <SettingsSection title="OAuth Providers">
        {PROVIDERS.map((provider, index) => (
          <View key={provider.id}>
            {index > 0 && <View style={styles.divider} />}
            <SettingsRow
              icon={
                provider.connected ? (
                  <Link color="#22c55e" size={16} strokeWidth={2} />
                ) : (
                  <Unlink color="#6b7280" size={16} strokeWidth={2} />
                )
              }
              label={provider.label}
              // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
              onPress={() => {}}
              type="navigate"
              value={provider.connected ? "Connected" : "Not connected"}
            />
          </View>
        ))}
      </SettingsSection>

      <View style={styles.hint}>
        <Text muted style={styles.hintText}>
          Connected accounts are used for single sign-on and syncing data from
          third-party services.
        </Text>
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
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  hint: {
    paddingHorizontal: theme.spacing[4],
  },
  hintText: {
    fontSize: 12,
    lineHeight: 16,
  },
}));
