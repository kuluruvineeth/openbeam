import { ArrowRightLeft, UserPlus, Users } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import { SettingsRow } from "./settings-row";
import { SettingsDivider, SettingsSection } from "./settings-section";

export function TeamSettingsScreen() {
  const insets = useSafeAreaInsets();
  const teams = useAuthStore((s) => s.teams);
  const selectedTeamId = useAuthStore((s) => s.selectedTeamId);
  const { selectTeam } = useAuth();

  const currentTeam = teams.find((t) => t.teamId === selectedTeamId);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
      style={styles.container}
    >
      {currentTeam && (
        <SettingsSection title="Current Team">
          <SettingsRow
            icon={<Users color="#6b7280" size={16} strokeWidth={2} />}
            label={currentTeam.teamName}
            type="info"
            value={currentTeam.role.toLowerCase()}
          />
        </SettingsSection>
      )}

      {teams.length > 1 && (
        <SettingsSection title="Switch Team">
          {teams
            .filter((t) => t.teamId !== selectedTeamId)
            .map((team, index) => (
              <View key={team.teamId}>
                {index > 0 && <SettingsDivider />}
                <SettingsRow
                  icon={
                    <ArrowRightLeft color="#6b7280" size={16} strokeWidth={2} />
                  }
                  label={team.teamName}
                  // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                  onPress={() => void selectTeam(team.teamId)}
                  sublabel={team.role.toLowerCase()}
                  type="action"
                />
              </View>
            ))}
        </SettingsSection>
      )}

      <SettingsSection title="Members">
        <SettingsRow
          icon={<UserPlus color="#6b7280" size={16} strokeWidth={2} />}
          label="Invite members"
          // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
          onPress={() => {}}
          sublabel="Invite people to your team"
          type="action"
        />
      </SettingsSection>

      <View style={styles.hint}>
        <Text muted style={styles.hintText}>
          Team management features like invitations and role changes are
          available on the web dashboard.
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
