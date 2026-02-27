import type { ComponentProps, ReactNode } from "react";
import {
  Text as NativeText,
  type StyleProp,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";

type TextVariant = "title" | "body" | "caption";
type TextWeight = "regular" | "medium" | "semibold" | "bold";

type TextProps = ComponentProps<typeof NativeText> & {
  muted?: boolean;
  variant?: TextVariant;
  weight?: TextWeight;
  children?: ReactNode;
};

function resolveTextWeight(
  weight: TextWeight | undefined
): TextStyle["fontWeight"] {
  switch (weight) {
    case "medium":
      return "500";
    case "semibold":
      return "600";
    case "bold":
      return "700";
    default:
      return "400";
  }
}

function resolveTextVariantStyles(
  variant: TextVariant | undefined
): Pick<TextStyle, "fontSize" | "lineHeight"> {
  switch (variant) {
    case "title":
      return { fontSize: 18, lineHeight: 24 };
    case "caption":
      return { fontSize: 12, lineHeight: 16 };
    default:
      return { fontSize: 14, lineHeight: 20 };
  }
}

export function Text({
  muted = false,
  variant = "body",
  weight = "regular",
  style,
  children,
  ...rest
}: TextProps) {
  const variantStyle = resolveTextVariantStyles(variant);
  const fontWeight = resolveTextWeight(weight);

  return (
    <NativeText
      {...rest}
      style={[
        styles.text,
        muted ? styles.textMuted : null,
        variantStyle,
        { fontWeight },
        style as StyleProp<TextStyle>,
      ]}
    >
      {children}
    </NativeText>
  );
}

export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.skeleton, style]} />;
}

const styles = StyleSheet.create((theme) => ({
  text: {
    color: theme.colors.foreground,
  },
  textMuted: {
    color: theme.colors.foregroundMuted,
  },
  skeleton: {
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface3,
  },
}));
