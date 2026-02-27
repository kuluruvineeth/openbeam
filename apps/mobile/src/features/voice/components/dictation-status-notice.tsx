import {
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCcw,
  RotateCcw,
  WifiOff,
  X,
} from "lucide-react-native";
import type { ComponentType } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { TOAST_COLORS } from "../constants";
import type {
  DictationStatusNoticeProps,
  DictationToastVariant,
} from "../types";

type IconComponent = ComponentType<{ size: number; color: string }>;

const variantIconMap: Record<DictationToastVariant, IconComponent> = {
  info: RefreshCcw,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertTriangle,
};

function resolveBackgroundColor(
  variant: DictationToastVariant,
  surfaceColor: string
): string {
  switch (variant) {
    case "success":
      return TOAST_COLORS.success;
    case "warning":
      return TOAST_COLORS.warning;
    case "error":
      return TOAST_COLORS.error;
    default:
      return surfaceColor;
  }
}

export function DictationStatusNotice({
  variant,
  title,
  subtitle,
  meta,
  actionLabel,
  onAction,
  onDismiss,
}: DictationStatusNoticeProps) {
  const { theme } = useUnistyles();

  const VariantIcon: IconComponent = (() => {
    if (variant === "warning" && title.toLowerCase().includes("offline")) {
      return WifiOff;
    }
    return variantIconMap[variant] ?? Info;
  })();

  const backgroundColor = resolveBackgroundColor(variant, theme.colors.muted);
  const foregroundColor =
    variant === "info" ? theme.colors.foreground : "#ffffff";
  const secondaryColor =
    variant === "info" ? theme.colors.mutedForeground : "#ffffff";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor: variant === "info" ? theme.colors.border : "transparent",
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <VariantIcon color={foregroundColor} size={16} />
          <Text style={[styles.title, { color: foregroundColor }]}>
            {title}
          </Text>
        </View>
        {onDismiss && (
          <Pressable
            accessibilityLabel="Dismiss dictation status"
            hitSlop={8}
            onPress={onDismiss}
          >
            <X color={foregroundColor} size={14} />
          </Pressable>
        )}
      </View>

      {subtitle && (
        <Text style={[styles.subtitle, { color: secondaryColor }]}>
          {subtitle}
        </Text>
      )}

      {(meta || (actionLabel && onAction)) && (
        <View style={styles.actionsRow}>
          {meta ? (
            <Text style={[styles.meta, { color: secondaryColor }]}>{meta}</Text>
          ) : (
            <View />
          )}
          {actionLabel && onAction && (
            <Pressable
              accessibilityLabel={actionLabel}
              accessibilityRole="button"
              onPress={onAction}
              style={[
                styles.actionButton,
                {
                  backgroundColor:
                    variant === "info"
                      ? theme.colors.primary
                      : "rgba(0,0,0,0.2)",
                },
              ]}
            >
              <RotateCcw
                color={
                  variant === "info"
                    ? theme.colors.primaryForeground
                    : foregroundColor
                }
                size={14}
              />
              <Text
                style={[
                  styles.actionText,
                  {
                    color:
                      variant === "info"
                        ? theme.colors.primaryForeground
                        : foregroundColor,
                  },
                ]}
              >
                {actionLabel}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    gap: theme.spacing[2],
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  meta: {
    fontSize: 11,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    borderRadius: 9999,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
  },
  actionText: {
    fontSize: 11,
    fontWeight: "600",
  },
}));
