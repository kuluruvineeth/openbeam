import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

type ProcessingIndicatorProps = {
  color: string;
  dotSize?: number;
  gap?: number;
};

const DOT_COUNT = 3;
const BOUNCE_HEIGHT = -6;
const STAGGER_MS = 150;

function BouncingDot({
  index,
  color,
  size,
}: {
  index: number;
  color: string;
  size: number;
}) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      index * STAGGER_MS,
      withRepeat(
        withSequence(
          withTiming(BOUNCE_HEIGHT, {
            duration: 300,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) })
        ),
        -1
      )
    );
  }, [index, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

export function ProcessingIndicator({
  color,
  dotSize = 4,
  gap = 4,
}: ProcessingIndicatorProps) {
  return (
    <View style={[styles.container, { gap }]}>
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
        <BouncingDot color={color} index={i} key={i} size={dotSize} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create(() => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 20,
  },
}));
