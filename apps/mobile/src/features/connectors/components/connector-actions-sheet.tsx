import { Pause, Play, RefreshCw, Settings, Zap } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";

type ConnectorActionsSheetProps = {
  connectorId: string;
  status: string;
  onTriggerFullSync: () => void;
  onTriggerIncrementalSync: () => void;
  onPause: () => void;
  onResume: () => void;
  onManage: () => void;
  onClose: () => void;
  isSyncPending: boolean;
};

type ActionItemProps = {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

function ActionItem({
  icon,
  label,
  onPress,
  disabled,
  destructive,
}: ActionItemProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionItem, disabled && styles.actionItemDisabled]}
    >
      {icon}
      <Text
        style={[
          styles.actionLabel,
          destructive && styles.actionLabelDestructive,
        ]}
        variant="body"
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ConnectorActionsSheet({
  // biome-ignore lint/correctness/noUnusedFunctionParameters: required by callback signature
  connectorId,
  status,
  onTriggerFullSync,
  onTriggerIncrementalSync,
  onPause,
  onResume,
  onManage,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: required by callback signature
  onClose,
  isSyncPending,
}: ConnectorActionsSheetProps) {
  const { theme } = useUnistyles();
  const isPaused = status === "INACTIVE";

  return (
    <View style={styles.container}>
      <View style={styles.handle} />

      <ActionItem
        disabled={isPaused || isSyncPending}
        icon={
          <Zap color={theme.colors.foreground} size={18} strokeWidth={1.5} />
        }
        label="Full Sync"
        onPress={onTriggerFullSync}
      />

      <ActionItem
        disabled={isPaused || isSyncPending}
        icon={
          <RefreshCw
            color={theme.colors.foreground}
            size={18}
            strokeWidth={1.5}
          />
        }
        label="Quick Sync"
        onPress={onTriggerIncrementalSync}
      />

      <ActionItem
        icon={
          <Settings
            color={theme.colors.foreground}
            size={18}
            strokeWidth={1.5}
          />
        }
        label="Manage"
        onPress={onManage}
      />

      <View style={styles.divider} />

      {isPaused ? (
        <ActionItem
          icon={
            <Play color={theme.colors.foreground} size={18} strokeWidth={1.5} />
          }
          label="Resume"
          onPress={onResume}
        />
      ) : (
        <ActionItem
          icon={
            <Pause
              color={theme.colors.destructive}
              size={18}
              strokeWidth={1.5}
            />
          }
          label="Pause"
          onPress={onPause}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    paddingBottom: theme.spacing[8],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: "center",
    marginBottom: theme.spacing[4],
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  actionItemDisabled: {
    opacity: 0.4,
  },
  actionLabel: {
    fontSize: 15,
  },
  actionLabelDestructive: {
    color: theme.colors.destructive,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing[2],
    marginHorizontal: theme.spacing[4],
  },
}));
