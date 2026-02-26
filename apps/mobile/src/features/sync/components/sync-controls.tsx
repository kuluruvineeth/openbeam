import { History, Pause, Play, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { useToast } from "@/contexts";
import {
  usePauseConnector,
  useResumeConnector,
  useTriggerSync,
} from "../hooks/use-sync";
import { isPaused, isSyncing, type SyncStatusType } from "../lib/sync-types";

type SyncControlsProps = {
  connectorId: string;
  syncStatus: SyncStatusType | undefined;
};

export function SyncControls({ connectorId, syncStatus }: SyncControlsProps) {
  const [syncType, setSyncType] = useState<"FULL" | "INCREMENTAL">("FULL");
  const toast = useToast();

  const triggerSync = useTriggerSync({
    onSuccess: () => toast.show("Sync started", { variant: "success" }),
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.show(`Sync failed: ${message}`, { variant: "error" });
    },
  });

  const pauseConnector = usePauseConnector({
    onSuccess: () => toast.show("Connector paused", { variant: "success" }),
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.show(`Pause failed: ${message}`, { variant: "error" });
    },
  });

  const resumeConnector = useResumeConnector({
    onSuccess: () => toast.show("Connector resumed", { variant: "success" }),
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.show(`Resume failed: ${message}`, { variant: "error" });
    },
  });

  const syncing = isSyncing(syncStatus);
  const paused = isPaused(syncStatus);
  const disabled = syncing || paused || triggerSync.isPending;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manual Sync</Text>
        <Text muted style={styles.subtitle}>
          Trigger a sync or pause/resume automatic syncing
        </Text>
      </View>

      <View style={styles.syncButtons}>
        <Pressable
          disabled={disabled}
          onPress={() => {
            setSyncType("FULL");
            triggerSync.mutate({ connectorId, type: "FULL" });
          }}
          style={[
            styles.syncButton,
            syncType === "FULL"
              ? styles.syncButtonActive
              : styles.syncButtonInactive,
            disabled && styles.syncButtonDisabled,
          ]}
        >
          {triggerSync.isPending && syncType === "FULL" ? (
            <ActivityIndicator size="small" />
          ) : (
            <Sparkles
              color={syncType === "FULL" ? "#fff" : "#6b7280"}
              size={14}
              strokeWidth={2}
            />
          )}
          <Text
            style={[
              styles.syncButtonText,
              syncType === "FULL"
                ? styles.syncButtonTextActive
                : styles.syncButtonTextInactive,
            ]}
          >
            Full Sync
          </Text>
        </Pressable>

        <Pressable
          disabled={disabled}
          onPress={() => {
            setSyncType("INCREMENTAL");
            triggerSync.mutate({ connectorId, type: "INCREMENTAL" });
          }}
          style={[
            styles.syncButton,
            syncType === "INCREMENTAL"
              ? styles.syncButtonActive
              : styles.syncButtonInactive,
            disabled && styles.syncButtonDisabled,
          ]}
        >
          {triggerSync.isPending && syncType === "INCREMENTAL" ? (
            <ActivityIndicator size="small" />
          ) : (
            <History
              color={syncType === "INCREMENTAL" ? "#fff" : "#6b7280"}
              size={14}
              strokeWidth={2}
            />
          )}
          <Text
            style={[
              styles.syncButtonText,
              syncType === "INCREMENTAL"
                ? styles.syncButtonTextActive
                : styles.syncButtonTextInactive,
            ]}
          >
            Incremental
          </Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      {paused ? (
        <Pressable
          disabled={resumeConnector.isPending}
          onPress={() => resumeConnector.mutate({ connectorId })}
          style={styles.pauseResumeButton}
        >
          {resumeConnector.isPending ? (
            <ActivityIndicator size="small" />
          ) : (
            <Play color="#6b7280" size={14} strokeWidth={2} />
          )}
          <Text style={styles.pauseResumeText}>Resume Connector</Text>
        </Pressable>
      ) : (
        <Pressable
          disabled={syncing || pauseConnector.isPending}
          onPress={() => pauseConnector.mutate({ connectorId })}
          style={[
            styles.pauseResumeButton,
            syncing && styles.syncButtonDisabled,
          ]}
        >
          {pauseConnector.isPending ? (
            <ActivityIndicator size="small" />
          ) : (
            <Pause color="#6b7280" size={14} strokeWidth={2} />
          )}
          <Text style={styles.pauseResumeText}>Pause Connector</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    padding: theme.spacing[4],
    gap: theme.spacing[4],
  },
  header: {
    gap: theme.spacing[1],
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.foreground,
  },
  subtitle: {
    fontSize: 12,
  },
  syncButtons: {
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  syncButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2],
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  syncButtonActive: {
    backgroundColor: theme.colors.foreground,
    borderColor: theme.colors.foreground,
  },
  syncButtonInactive: {
    backgroundColor: "transparent",
    borderColor: theme.colors.border,
  },
  syncButtonDisabled: {
    opacity: 0.4,
  },
  syncButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  syncButtonTextActive: {
    color: theme.colors.background,
  },
  syncButtonTextInactive: {
    color: theme.colors.foreground,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  pauseResumeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2],
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pauseResumeText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.foreground,
  },
}));
