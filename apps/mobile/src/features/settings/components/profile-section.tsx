import { User } from "lucide-react-native";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { useAuthStore } from "@/features/auth";

export function ProfileSection() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <User color="#6b7280" size={24} strokeWidth={1.5} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{user.name}</Text>
        <Text muted style={styles.email}>
          {user.email}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing[4],
    gap: theme.spacing[3],
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  email: {
    fontSize: 13,
  },
}));
