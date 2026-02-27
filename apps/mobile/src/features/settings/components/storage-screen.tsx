import AsyncStorage from "@react-native-async-storage/async-storage";
import { HardDrive, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { SettingsRow } from "./settings-row";
import { SettingsSection } from "./settings-section";

export function StorageScreen() {
  const insets = useSafeAreaInsets();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCache = () => {
    Alert.alert(
      "Clear cache",
      "This will clear locally cached data. Your account and settings will not be affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            setIsClearing(true);
            try {
              const keys = await AsyncStorage.getAllKeys();
              const cacheKeys = keys.filter((k) => k.startsWith("@cache:"));
              if (cacheKeys.length > 0) {
                await AsyncStorage.multiRemove(cacheKeys);
              }
              Alert.alert("Cache cleared", "Local cache has been cleared.");
            } finally {
              setIsClearing(false);
            }
          },
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
      <SettingsSection title="Cache">
        <SettingsRow
          icon={<Trash2 color="#6b7280" size={16} strokeWidth={2} />}
          label="Clear cache"
          loading={isClearing}
          onPress={handleClearCache}
          sublabel="Remove locally cached search results and documents"
          type="action"
        />
      </SettingsSection>

      <SettingsSection title="Offline">
        <SettingsRow
          disabled
          icon={<HardDrive color="#6b7280" size={16} strokeWidth={2} />}
          label="Offline mode"
          // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
          onValueChange={() => {}}
          sublabel="Cache recent documents for offline access"
          type="toggle"
          value={false}
        />
      </SettingsSection>

      <View style={styles.hint}>
        <Text muted style={styles.hintText}>
          Offline mode is not yet available. We are working on bringing offline
          support to the mobile app.
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
  hint: {
    paddingHorizontal: theme.spacing[4],
  },
  hintText: {
    fontSize: 12,
    lineHeight: 16,
  },
}));
