import { Link2 } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";

type ConnectorsEmptyStateProps = {
  onBrowse?: () => void;
};

export function ConnectorsEmptyState({ onBrowse }: ConnectorsEmptyStateProps) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Link2
          color={theme.colors.mutedForeground}
          size={24}
          strokeWidth={1.5}
        />
      </View>

      <Text style={styles.title} variant="body" weight="medium">
        Connect your first source
      </Text>

      <Text muted style={styles.subtitle} variant="caption">
        Link your tools and data will flow automatically. Gmail, Slack, Notion,
        and 20+ more.
      </Text>

      {onBrowse && (
        <Pressable onPress={onBrowse} style={styles.button}>
          <Text style={styles.buttonText} variant="caption" weight="medium">
            Browse connectors
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[8],
    paddingVertical: theme.spacing[16],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing[4],
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginTop: theme.spacing[2],
    maxWidth: 260,
  },
  button: {
    marginTop: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.foreground,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: 13,
  },
}));
