import { LogOut, Trash2 } from "lucide-react-native";
import { Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import { SettingsRow } from "./settings-row";
import { SettingsDivider, SettingsSection } from "./settings-section";

export function DangerZoneScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const teams = useAuthStore((s) => s.teams);
  const selectedTeamId = useAuthStore((s) => s.selectedTeamId);

  const currentTeam = teams.find((t) => t.teamId === selectedTeamId);

  const handleLeaveTeam = () => {
    if (!currentTeam) {
      return;
    }
    Alert.alert(
      "Leave team",
      `Are you sure you want to leave ${currentTeam.teamName}? You will lose access to all team data.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
          onPress: () => {},
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "This action is permanent and cannot be undone. All your data will be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
          onPress: () => {},
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        // biome-ignore lint/complexity/noVoid: fire-and-forget async call
        onPress: () => void signOut(),
      },
    ]);
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
      style={styles.container}
    >
      <View style={styles.warning}>
        <Text style={styles.warningText}>
          Actions on this page are destructive and may be irreversible.
        </Text>
      </View>

      <SettingsSection>
        <SettingsRow
          destructive
          icon={<LogOut color="#ef4444" size={16} strokeWidth={2} />}
          label="Sign out"
          onPress={handleSignOut}
          type="action"
        />
        {currentTeam && (
          <>
            <SettingsDivider />
            <SettingsRow
              destructive
              icon={<LogOut color="#ef4444" size={16} strokeWidth={2} />}
              label={`Leave ${currentTeam.teamName}`}
              onPress={handleLeaveTeam}
              sublabel="You will lose access to all team data"
              type="action"
            />
          </>
        )}
        <SettingsDivider />
        <SettingsRow
          destructive
          icon={<Trash2 color="#ef4444" size={16} strokeWidth={2} />}
          label="Delete account"
          onPress={handleDeleteAccount}
          sublabel="Permanently delete your account and all data"
          type="action"
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
  warning: {
    padding: theme.spacing[3],
    borderRadius: 6,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  warningText: {
    fontSize: 13,
    color: "#ef4444",
    lineHeight: 18,
  },
}));
