import { Mic } from "lucide-react-native";
import { useCallback, useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useDictationStore } from "@/stores/dictation-store";

const PULSE_DURATION = 800;

export function DictationAction() {
  const { theme } = useUnistyles();
  const dictationState = useDictationStore((s) => s.state);
  const start = useDictationStore((s) => s.start);
  const stop = useDictationStore((s) => s.stop);

  const isActive =
    dictationState === "recording" || dictationState === "starting";
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.6, {
            duration: PULSE_DURATION,
            easing: Easing.out(Easing.ease),
          }),
          withTiming(1, {
            duration: PULSE_DURATION,
            easing: Easing.in(Easing.ease),
          })
        ),
        -1
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 150 });
    }
  }, [isActive, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 2 - pulseScale.value,
  }));

  const handlePress = useCallback(() => {
    if (isActive) {
      stop();
    } else {
      start("hands-free");
    }
  }, [isActive, start, stop]);

  return (
    <Pressable
      accessibilityLabel={isActive ? "Stop dictation" : "Start dictation"}
      accessibilityRole="button"
      accessible
      onPress={handlePress}
    >
      {({ hovered }) => (
        <View
          style={[
            styles.container,
            hovered && !isActive && styles.containerHovered,
            isActive && styles.containerActive,
          ]}
        >
          <View style={styles.iconWrapper}>
            {isActive && <Animated.View style={[styles.pulse, pulseStyle]} />}
            <Mic
              color={
                isActive
                  ? theme.colors.palette.red[500]
                  : // biome-ignore lint/style/noNestedTernary: readable inline conditional
                    hovered
                    ? theme.colors.foreground
                    : theme.colors.foregroundMuted
              }
              size={16}
            />
          </View>
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              isActive && styles.labelActive,
              hovered && !isActive && styles.labelHovered,
            ]}
          >
            {isActive ? "Recording..." : "Dictate"}
          </Text>
          {isActive && <View style={styles.recordingDot} />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing[2],
  },
  containerHovered: {
    backgroundColor: theme.colors.surface1,
  },
  containerActive: {
    backgroundColor: `${theme.colors.palette.red[500]}10`,
  },
  iconWrapper: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: `${theme.colors.palette.red[500]}30`,
  },
  label: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
  },
  labelActive: {
    color: theme.colors.palette.red[500],
    fontWeight: theme.fontWeight.medium,
  },
  labelHovered: {
    color: theme.colors.foreground,
  },
  recordingDot: {
    width: 6,
    height: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.palette.red[500],
  },
}));
