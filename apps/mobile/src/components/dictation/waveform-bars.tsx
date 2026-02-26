import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

type WaveformBarsProps = {
  barCount: number;
  isRecording: boolean;
  voiceDetected: boolean;
  accentColor: string;
  height: number;
};

const BAR_WIDTH = 3;
const STAGGER_MS = 60;
const IDLE_SCALE = 0.15;
const QUIET_SCALE = 0.2;

function WaveformBar({
  index,
  isRecording,
  voiceDetected,
  accentColor,
  height,
}: {
  index: number;
  isRecording: boolean;
  voiceDetected: boolean;
  accentColor: string;
  height: number;
}) {
  const scale = useSharedValue(IDLE_SCALE);

  useEffect(() => {
    cancelAnimation(scale);

    if (!isRecording) {
      scale.value = withTiming(IDLE_SCALE, { duration: 200 });
      return;
    }

    const delay = index * STAGGER_MS;

    if (voiceDetected) {
      const minScale = 0.2 + Math.random() * 0.1;
      const midScale = 0.4 + Math.random() * 0.15;
      const maxScale = 0.7 + Math.random() * 0.3;

      scale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(midScale, {
              duration: 120,
              easing: Easing.out(Easing.quad),
            }),
            withTiming(maxScale, {
              duration: 100,
              easing: Easing.out(Easing.quad),
            }),
            withTiming(midScale, {
              duration: 120,
              easing: Easing.inOut(Easing.quad),
            }),
            withTiming(minScale, {
              duration: 140,
              easing: Easing.in(Easing.quad),
            }),
            withTiming(midScale, {
              duration: 120,
              easing: Easing.out(Easing.quad),
            })
          ),
          -1
        )
      );
    } else {
      scale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(QUIET_SCALE + 0.05, {
              duration: 600,
              easing: Easing.inOut(Easing.sin),
            }),
            withTiming(QUIET_SCALE, {
              duration: 600,
              easing: Easing.inOut(Easing.sin),
            })
          ),
          -1
        )
      );
    }
  }, [isRecording, voiceDetected, index, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: scale.value * height,
    backgroundColor: accentColor,
  }));

  return <Animated.View style={[styles.bar, animatedStyle]} />;
}

export function WaveformBars({
  barCount,
  isRecording,
  voiceDetected,
  accentColor,
  height,
}: WaveformBarsProps) {
  return (
    <View style={[styles.container, { height }]}>
      {Array.from({ length: barCount }, (_, i) => (
        <WaveformBar
          accentColor={accentColor}
          height={height}
          index={i}
          isRecording={isRecording}
          // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
          key={i}
          voiceDetected={voiceDetected}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create(() => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 9999,
    minHeight: 3,
  },
}));
