import {
  Bell,
  HardDrive,
  Info,
  Keyboard,
  Link,
  Mic,
  Palette,
  Shield,
  Users,
} from "lucide-react-native";
import { Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { getIsTauri } from "@/constants/layout";
import { ProfileSection } from "./profile-section";
import { SettingsRow } from "./settings-row";
import { SettingsDivider, SettingsSection } from "./settings-section";

type SettingsHubScreenProps = {
  onNavigate: (screen: string) => void;
};

export function SettingsHubScreen({ onNavigate }: SettingsHubScreenProps) {
  const insets = useSafeAreaInsets();
  const isDesktop = Platform.OS === "web" && getIsTauri();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
      style={styles.container}
    >
      <ProfileSection />

      <SettingsSection title="General">
        <SettingsRow
          icon={<Users color="#6b7280" size={16} strokeWidth={2} />}
          label="Team"
          onPress={() => onNavigate("team")}
          type="navigate"
        />
        <SettingsDivider />
        <SettingsRow
          icon={<Palette color="#6b7280" size={16} strokeWidth={2} />}
          label="Appearance"
          onPress={() => onNavigate("appearance")}
          type="navigate"
        />
        <SettingsDivider />
        <SettingsRow
          icon={<Bell color="#6b7280" size={16} strokeWidth={2} />}
          label="Notifications"
          onPress={() => onNavigate("notifications")}
          type="navigate"
        />
        <SettingsDivider />
        <SettingsRow
          icon={<Mic color="#6b7280" size={16} strokeWidth={2} />}
          label="Dictation"
          onPress={() => onNavigate("dictation")}
          type="navigate"
        />
        {isDesktop && (
          <>
            <SettingsDivider />
            <SettingsRow
              icon={<Keyboard color="#6b7280" size={16} strokeWidth={2} />}
              label="Keyboard shortcuts"
              onPress={() => onNavigate("shortcuts")}
              type="navigate"
            />
          </>
        )}
      </SettingsSection>

      <SettingsSection title="Account">
        <SettingsRow
          icon={<Link color="#6b7280" size={16} strokeWidth={2} />}
          label="Connected accounts"
          onPress={() => onNavigate("connected-accounts")}
          type="navigate"
        />
        <SettingsDivider />
        <SettingsRow
          icon={<Shield color="#6b7280" size={16} strokeWidth={2} />}
          label="Security"
          onPress={() => onNavigate("security")}
          type="navigate"
        />
      </SettingsSection>

      <SettingsSection title="Data">
        <SettingsRow
          icon={<HardDrive color="#6b7280" size={16} strokeWidth={2} />}
          label="Storage & cache"
          onPress={() => onNavigate("storage")}
          type="navigate"
        />
      </SettingsSection>

      <SettingsSection>
        <SettingsRow
          icon={<Info color="#6b7280" size={16} strokeWidth={2} />}
          label="About"
          onPress={() => onNavigate("about")}
          type="navigate"
        />
        <SettingsDivider />
        <SettingsRow
          destructive
          icon={<Shield color="#ef4444" size={16} strokeWidth={2} />}
          label="Danger zone"
          onPress={() => onNavigate("danger-zone")}
          type="navigate"
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
    paddingTop: theme.spacing[2],
  },
}));
