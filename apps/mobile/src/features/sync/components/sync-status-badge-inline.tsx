import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import type { SyncStatusConfig } from "../lib/sync-status";

type SyncStatusBadgeInlineProps = {
  config: SyncStatusConfig;
};

export function SyncStatusBadgeInline({ config }: SyncStatusBadgeInlineProps) {
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

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      {config.animated ? (
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Icon color={config.color} size={10} strokeWidth={2} />
        </Animated.View>
      ) : (
        <Icon color={config.color} size={10} strokeWidth={2} />
      )}
      <Text style={[styles.label, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 2,
    borderRadius: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
}));
