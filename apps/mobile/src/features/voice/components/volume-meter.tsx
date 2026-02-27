import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

type VolumeMeterProps = {
  volume: number;
  isMuted: boolean;
  isDetecting: boolean;
  isSpeaking: boolean;
  orientation?: "horizontal" | "vertical";
  color?: string;
};

const BAR_COUNT = 5;
const ANIMATE_DURATION = 80;

export function VolumeMeter({
  volume,
  isMuted,
  isDetecting,
  orientation = "horizontal",
  color,
}: VolumeMeterProps) {
  const { theme } = useUnistyles();
  const barColor = color ?? theme.colors.foreground;
  const mutedColor = theme.colors.mutedForeground;
  const isHorizontal = orientation === "horizontal";

  const animatedValues = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.15))
  ).current;

  useEffect(() => {
    const effectiveVolume = isMuted ? 0 : volume;

    const animations = animatedValues.map((anim, i) => {
      const threshold = (i + 1) / BAR_COUNT;
      const barHeight =
        effectiveVolume >= threshold ? 0.2 + threshold * 0.8 : 0.15;

      return Animated.timing(anim, {
        toValue: barHeight,
        duration: ANIMATE_DURATION,
        useNativeDriver: false,
      });
    });

    Animated.parallel(animations).start();
  }, [volume, isMuted, animatedValues]);

  return (
    <View
      style={[
        styles.container,
        isHorizontal ? styles.horizontal : styles.vertical,
      ]}
    >
      {animatedValues.map((anim, i) => {
        const activeColor = isDetecting ? barColor : mutedColor;

        if (isHorizontal) {
          return (
            <Animated.View
              // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
              key={i}
              style={[
                styles.barHorizontal,
                {
                  backgroundColor: isMuted ? mutedColor : activeColor,
                  height: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 20],
                  }),
                },
              ]}
            />
          );
        }

        return (
          <Animated.View
            // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
            key={i}
            style={[
              styles.barVertical,
              {
                backgroundColor: isMuted ? mutedColor : activeColor,
                width: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, 20],
                }),
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create((_theme) => ({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  horizontal: {
    flexDirection: "row",
    height: 20,
  },
  vertical: {
    flexDirection: "column",
    width: 20,
  },
  barHorizontal: {
    width: 3,
    borderRadius: 1.5,
    minHeight: 4,
  },
  barVertical: {
    height: 3,
    borderRadius: 1.5,
    minWidth: 4,
  },
}));
