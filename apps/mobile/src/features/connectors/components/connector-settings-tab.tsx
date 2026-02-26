import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { useConnectorSyncStatus } from "../hooks";
import { DangerZone } from "./danger-zone";

type ConnectorSettingsTabProps = {
  connectorId: string;
};

export function ConnectorSettingsTab({
  connectorId,
}: ConnectorSettingsTabProps) {
  // biome-ignore lint/correctness/noUnusedVariables: destructured for side effect
  const { data: syncStatus, isLoading } = useConnectorSyncStatus(connectorId);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text muted variant="caption">
          Loading settings...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DangerZone connectorId={connectorId} status="ACTIVE" />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[4],
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing[16],
  },
}));
