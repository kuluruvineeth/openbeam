import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";

type SettingsSectionProps = {
  title?: string;
  children: React.ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      {title && (
        <Text muted style={styles.title}>
          {title}
        </Text>
      )}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export function SettingsDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create((theme) => ({
  section: {
    gap: theme.spacing[2],
  },
  title: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: theme.spacing[4],
  },
  card: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
}));
