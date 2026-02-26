import { ChevronRight } from "lucide-react-native";
import { Pressable, Switch, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";

type SettingsRowBaseProps = {
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  destructive?: boolean;
};

type SettingsRowNavigateProps = SettingsRowBaseProps & {
  type: "navigate";
  value?: string;
  onPress: () => void;
};

type SettingsRowToggleProps = SettingsRowBaseProps & {
  type: "toggle";
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

type SettingsRowActionProps = SettingsRowBaseProps & {
  type: "action";
  onPress: () => void;
  loading?: boolean;
};

type SettingsRowInfoProps = SettingsRowBaseProps & {
  type: "info";
  value: string;
};

export type SettingsRowProps =
  | SettingsRowNavigateProps
  | SettingsRowToggleProps
  | SettingsRowActionProps
  | SettingsRowInfoProps;

export function SettingsRow(props: SettingsRowProps) {
  const { label, sublabel, icon, destructive } = props;

  const content = (
    <View style={styles.row}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <View style={styles.labelContainer}>
        <Text style={[styles.label, destructive && styles.labelDestructive]}>
          {label}
        </Text>
        {sublabel && (
          <Text muted style={styles.sublabel}>
            {sublabel}
          </Text>
        )}
      </View>
      {props.type === "navigate" && (
        <View style={styles.trailingContainer}>
          {props.value && (
            <Text muted style={styles.valueText}>
              {props.value}
            </Text>
          )}
          <ChevronRight color="#6b7280" size={16} strokeWidth={2} />
        </View>
      )}
      {props.type === "toggle" && (
        <Switch
          disabled={props.disabled}
          onValueChange={props.onValueChange}
          thumbColor="#fff"
          trackColor={{ false: "#3f3f46", true: "#22c55e" }}
          value={props.value}
        />
      )}
      {props.type === "info" && (
        <Text muted style={styles.valueText}>
          {props.value}
        </Text>
      )}
      {props.type === "action" && (
        <ChevronRight color="#6b7280" size={16} strokeWidth={2} />
      )}
    </View>
  );

  if (props.type === "navigate" || props.type === "action") {
    return (
      <Pressable
        onPress={props.onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    minHeight: 48,
    gap: theme.spacing[3],
  },
  pressed: {
    backgroundColor: theme.colors.muted,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  labelContainer: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 15,
    color: theme.colors.foreground,
  },
  labelDestructive: {
    color: "#ef4444",
  },
  sublabel: {
    fontSize: 12,
  },
  trailingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  valueText: {
    fontSize: 14,
  },
}));
