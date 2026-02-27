import { Check, Users } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { useAuth } from "../hooks/use-auth";

export function TeamSelectScreen() {
  const insets = useSafeAreaInsets();
  const { teams, selectedTeamId, selectTeam } = useAuth();
  const [loadingTeamId, setLoadingTeamId] = useState<string | null>(null);

  const handleSelectTeam = async (teamId: string) => {
    setLoadingTeamId(teamId);
    try {
      await selectTeam(teamId);
    } finally {
      setLoadingTeamId(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Select a team</Text>
          <Text muted style={styles.subtitle}>
            Choose the team you want to work with
          </Text>
        </View>

        <View style={styles.teamList}>
          {teams.map((team) => {
            const isSelected = team.teamId === selectedTeamId;
            const isLoading = team.teamId === loadingTeamId;

            return (
              <Pressable
                disabled={isLoading}
                key={team.teamId}
                onPress={() => handleSelectTeam(team.teamId)}
                style={({ pressed }) => [
                  styles.teamCard,
                  isSelected && styles.teamCardSelected,
                  pressed && styles.teamCardPressed,
                ]}
              >
                <View style={styles.teamIcon}>
                  {team.teamLogo ? (
                    <Text style={styles.teamLogoText}>
                      {team.teamName.charAt(0).toUpperCase()}
                    </Text>
                  ) : (
                    <Users color="#6b7280" size={18} strokeWidth={2} />
                  )}
                </View>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{team.teamName}</Text>
                  <Text muted style={styles.teamRole}>
                    {team.role.toLowerCase()}
                  </Text>
                </View>
                {isLoading ? (
                  <ActivityIndicator color="#6b7280" size="small" />
                  // biome-ignore lint/style/noNestedTernary: readable inline conditional
                ) : isSelected ? (
                  <Check color="#22c55e" size={18} strokeWidth={2} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing[6],
    paddingTop: theme.spacing[16],
    gap: theme.spacing[8],
  },
  header: {
    gap: theme.spacing[2],
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  subtitle: {
    fontSize: 14,
  },
  teamList: {
    gap: theme.spacing[2],
  },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    gap: theme.spacing[3],
  },
  teamCardSelected: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34, 197, 94, 0.05)",
  },
  teamCardPressed: {
    backgroundColor: theme.colors.muted,
  },
  teamIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  teamLogoText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  teamInfo: {
    flex: 1,
    gap: 2,
  },
  teamName: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.foreground,
  },
  teamRole: {
    fontSize: 12,
  },
}));
