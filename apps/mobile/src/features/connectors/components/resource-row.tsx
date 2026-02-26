import { ChevronRight, Lock } from "lucide-react-native";
import { Pressable, Switch, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import {
  formatDocumentCount,
  formatResourceType,
  getResourceIcon,
} from "../lib";
import type { ConnectorResource } from "../types";

type ResourceRowProps = {
  resource: ConnectorResource;
  onToggle: (enabled: boolean) => void;
  onPress: () => void;
  disabled?: boolean;
};

export function ResourceRow({
  resource,
  onToggle,
  onPress,
  disabled,
}: ResourceRowProps) {
  const { theme } = useUnistyles();
  const Icon = getResourceIcon(resource.resourceType);
  const isPrivate = resource.resourceType.toLowerCase().includes("private");
  const hasDocuments = resource.documentCount > 0;

  return (
    <Pressable
      onPress={hasDocuments ? onPress : undefined}
      style={[
        styles.container,
        !resource.syncEnabled && styles.containerDisabled,
      ]}
    >
      <Switch
        disabled={disabled}
        onValueChange={onToggle}
        style={styles.toggle}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.primary,
        }}
        value={resource.syncEnabled}
      />

      <View style={styles.iconWrapper}>
        <Icon
          color={theme.colors.mutedForeground}
          size={14}
          strokeWidth={1.5}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name} variant="body">
            {resource.name || "Untitled"}
          </Text>
          {isPrivate && (
            <Lock
              color={theme.colors.mutedForeground}
              size={10}
              strokeWidth={1.5}
            />
          )}
        </View>
        <Text muted style={styles.meta}>
          {formatResourceType(resource.resourceType)}
        </Text>
      </View>

      {hasDocuments && (
        <Text muted style={styles.count}>
          {formatDocumentCount(resource.documentCount)}
        </Text>
      )}

      {hasDocuments && (
        <ChevronRight
          color={theme.colors.mutedForeground}
          size={14}
          strokeWidth={1.5}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: 10,
  },
  containerDisabled: {
    opacity: 0.4,
  },
  toggle: {
    transform: [{ scale: 0.7 }],
  },
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  name: {
    fontSize: 13,
    flex: 1,
  },
  meta: {
    fontSize: 10,
  },
  count: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
}));
