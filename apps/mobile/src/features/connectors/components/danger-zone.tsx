import { AlertTriangle } from "lucide-react-native";
import { Alert, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import {
  useDisconnectConnector,
  usePauseConnector,
  useRestoreConnector,
  useResumeConnector,
} from "../hooks";

type DangerZoneProps = {
  connectorId: string;
  status: string;
  scheduledDeletionAt?: Date | string | null;
};

type DangerZoneItemProps = {
  title: string;
  description: string;
  buttonLabel: string;
  onPress: () => void;
  isPending: boolean;
  destructive?: boolean;
};

function DangerZoneItem({
  title,
  description,
  buttonLabel,
  onPress,
  isPending,
  destructive,
}: DangerZoneItemProps) {
  return (
    <View style={styles.item}>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle} weight="medium">
          {title}
        </Text>
        <Text muted style={styles.itemDescription}>
          {description}
        </Text>
      </View>
      <Pressable
        disabled={isPending}
        onPress={onPress}
        style={[
          styles.itemButton,
          destructive && styles.itemButtonDestructive,
          isPending && styles.itemButtonDisabled,
        ]}
      >
        <Text
          style={[
            styles.itemButtonText,
            destructive && styles.itemButtonTextDestructive,
          ]}
          variant="caption"
          weight="medium"
        >
          {isPending ? "..." : buttonLabel}
        </Text>
      </Pressable>
    </View>
  );
}

export function DangerZone({
  connectorId,
  status,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: required by callback signature
  scheduledDeletionAt,
}: DangerZoneProps) {
  // biome-ignore lint/correctness/noUnusedVariables: destructured for side effect
  const { theme } = useUnistyles();
  const pauseMutation = usePauseConnector();
  const resumeMutation = useResumeConnector();
  const disconnectMutation = useDisconnectConnector();
  const restoreMutation = useRestoreConnector();

  const isDeleting = status === "DELETING";
  const isPaused = status === "INACTIVE";

  const handleDelete = () => {
    Alert.alert(
      "Delete Connector",
      "This will schedule the connector for permanent deletion. All indexed documents will be removed after 72 hours.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => disconnectMutation.mutate(connectorId),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AlertTriangle color="#dc2626" size={14} strokeWidth={1.5} />
        <Text style={styles.headerText} weight="medium">
          Danger Zone
        </Text>
      </View>

      <DangerZoneItem
        buttonLabel={isPaused ? "Resume" : "Pause"}
        description="Temporarily stop syncing. Indexed data remains searchable."
        isPending={
          isPaused ? resumeMutation.isPending : pauseMutation.isPending
        }
        onPress={() =>
          isPaused
            ? resumeMutation.mutate(connectorId)
            : pauseMutation.mutate(connectorId)
        }
        title={isPaused ? "Resume Connector" : "Pause Connector"}
      />

      <View style={styles.divider} />

      {isDeleting ? (
        <DangerZoneItem
          buttonLabel="Cancel Deletion"
          description="Connector is scheduled for deletion."
          isPending={restoreMutation.isPending}
          onPress={() => restoreMutation.mutate(connectorId)}
          title="Cancel Deletion"
        />
      ) : (
        <DangerZoneItem
          buttonLabel="Delete"
          description="Remove connector and all indexed data. 72-hour grace period."
          destructive
          isPending={disconnectMutation.isPending}
          onPress={handleDelete}
          title="Delete Connector"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    borderWidth: 1,
    borderColor: "#dc262633",
    borderRadius: 8,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 10,
    backgroundColor: "#dc26260d",
  },
  headerText: {
    fontSize: 13,
    color: theme.colors.foreground,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[3],
  },
  itemContent: {
    flex: 1,
    marginRight: theme.spacing[3],
    gap: 2,
  },
  itemTitle: {
    fontSize: 13,
    color: theme.colors.foreground,
  },
  itemDescription: {
    fontSize: 11,
  },
  itemButton: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemButtonDestructive: {
    borderColor: "#dc262666",
    backgroundColor: "#dc26260d",
  },
  itemButtonDisabled: {
    opacity: 0.5,
  },
  itemButtonText: {
    fontSize: 12,
    color: theme.colors.foreground,
  },
  itemButtonTextDestructive: {
    color: "#dc2626",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#dc262633",
  },
}));
