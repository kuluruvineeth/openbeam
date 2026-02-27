import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { ScreenHeader } from "./screen-header";

interface BackHeaderProps {
  title?: string;
  rightContent?: ReactNode;
  onBack?: () => void;
}

export function BackHeader({ title, rightContent, onBack }: BackHeaderProps) {
  const { theme } = useUnistyles();

  return (
    <ScreenHeader
      left={
        <>
          <Pressable
            onPress={onBack ?? (() => router.back())}
            style={styles.backButton}
          >
            <ArrowLeft
              color={theme.colors.foregroundMuted}
              size={theme.iconSize.lg}
            />
          </Pressable>
          {title && (
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
          )}
        </>
      }
      leftStyle={styles.left}
      right={rightContent}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  left: {
    gap: theme.spacing[2],
  },
  backButton: {
    padding: {
      xs: theme.spacing[3],
      md: theme.spacing[2],
    },
    borderRadius: theme.borderRadius.lg,
  },
  title: {
    flex: 1,
    fontSize: theme.fontSize.lg,
    fontWeight: {
      xs: theme.fontWeight.semibold,
      md: "400",
    },
    color: theme.colors.foreground,
  },
}));
