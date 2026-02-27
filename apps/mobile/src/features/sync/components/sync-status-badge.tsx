import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { getSyncStatusConfig, type SyncStatus } from "../lib/sync-status";

type SyncStatusBadgeProps = {
  status: SyncStatus;
  totalIndexed?: number;
  onPress?: () => void;
};

function getStatusLabel(status: SyncStatus, totalIndexed?: number): string {
  if (status === "ACTIVE") {
    return totalIndexed && totalIndexed > 0 ? "Indexed" : "Ready";
  }
  return getSyncStatusConfig(status).label;
}

function SpinningIcon({
  config,
}: {
  config: ReturnType<typeof getSyncStatusConfig>;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  const Icon = config.icon;

  useEffect(() => {
    if (!config.animated) {
      return;
    }
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [config.animated, spin]);

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  if (config.animated) {
    return (
      <Animated.View style={{ transform: [{ rotate: rotation }] }}>
        <Icon color={config.color} size={10} strokeWidth={2} />
      </Animated.View>
    );
  }

  return <Icon color={config.color} size={10} strokeWidth={2} />;
}

export function SyncStatusBadge({
  status,
  totalIndexed,
  onPress,
}: SyncStatusBadgeProps) {
  const config = getSyncStatusConfig(status);
  const label = getStatusLabel(status, totalIndexed);

  const badge = (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      <SpinningIcon config={config} />
      <Text style={[styles.label, { color: config.color }]}>{label}</Text>
      {totalIndexed !== undefined && totalIndexed > 0 && (
        <>
          <Text style={[styles.separator, { color: config.color }]}>
            {"\u00B7"}
          </Text>
          <Text style={[styles.count, { color: config.color }]}>
            {totalIndexed.toLocaleString()}
          </Text>
        </>
      )}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{badge}</Pressable>;
  }

  return badge;
}

const styles = StyleSheet.create((theme) => ({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 2,
    borderRadius: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  separator: {
    fontSize: 10,
    opacity: 0.5,
  },
  count: {
    fontSize: 10,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
}));
