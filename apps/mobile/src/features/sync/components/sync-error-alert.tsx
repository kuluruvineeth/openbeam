import { AlertCircle, RotateCw } from "lucide-react-native";
import { ActivityIndicator, Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { useToast } from "@/contexts";
import { useTriggerSync } from "../hooks/use-sync";

type SyncErrorAlertProps = {
  connectorId: string;
  error: string;
};

export function SyncErrorAlert({ connectorId, error }: SyncErrorAlertProps) {
  const toast = useToast();

  const triggerSync = useTriggerSync({
    onSuccess: () => {
      toast.show("Sync restarted", { variant: "success" });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.show(`Failed: ${message}`, { variant: "error" });
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AlertCircle color="#dc2626" size={14} strokeWidth={2} />
        <Text style={styles.title}>Sync Error</Text>
      </View>
      <Text numberOfLines={3} style={styles.message}>
        {error}
      </Text>
      <Pressable
        disabled={triggerSync.isPending}
        onPress={() => triggerSync.mutate({ connectorId, type: "FULL" })}
        style={styles.retryButton}
      >
        {triggerSync.isPending ? (
          <ActivityIndicator color="#dc2626" size="small" />
        ) : (
          <RotateCw color="#dc2626" size={12} strokeWidth={2} />
        )}
        <Text style={styles.retryText}>Retry Sync</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.2)",
    backgroundColor: "rgba(220, 38, 38, 0.04)",
    borderRadius: 6,
    padding: theme.spacing[3],
    gap: theme.spacing[2],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: "#dc2626",
  },
  message: {
    fontSize: 12,
    color: theme.colors.foreground,
    opacity: 0.6,
    lineHeight: 16,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.3)",
    borderRadius: 6,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  retryText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#dc2626",
  },
}));
