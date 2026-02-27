import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { CHART_TYPE_OPTIONS } from "../constants";
import type { ChartConfig, ChartType } from "../types";

type ChartConfigPanelProps = {
  type: ChartType;
  config: ChartConfig;
  onTypeChange: (type: ChartType) => void;
  onConfigChange: (config: ChartConfig) => void;
};

export function ChartConfigPanel({
  type,
  config,
  onTypeChange,
  onConfigChange,
}: ChartConfigPanelProps) {
  const { theme } = useUnistyles();

  const updateConfig = (partial: Partial<ChartConfig>) => {
    onConfigChange({ ...config, ...partial });
  };

  const showXY =
    type !== "pie" &&
    type !== "donut" &&
    type !== "funnel" &&
    type !== "metric";

  const showNameValue = type === "pie" || type === "donut" || type === "funnel";

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text
          style={[styles.sectionLabel, { color: theme.colors.mutedForeground }]}
        >
          Chart Type
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.typeScroll}
        >
          <View style={styles.typeRow}>
            {CHART_TYPE_OPTIONS.map((option) => (
              <Pressable
                key={option.type}
                onPress={() => onTypeChange(option.type)}
                style={[
                  styles.typeButton,
                  type === option.type && styles.typeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === option.type && styles.typeButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text
          style={[styles.sectionLabel, { color: theme.colors.mutedForeground }]}
        >
          Title
        </Text>
        <TextInput
          onChangeText={(text) => updateConfig({ title: text })}
          placeholder="Chart title"
          placeholderTextColor={theme.colors.mutedForeground}
          style={styles.input}
          value={config.title ?? ""}
        />
      </View>

      {showXY && (
        <View style={styles.fieldRow}>
          <View style={styles.fieldCol}>
            <Text
              style={[
                styles.fieldLabel,
                { color: theme.colors.mutedForeground },
              ]}
            >
              X Field
            </Text>
            <TextInput
              onChangeText={(text) => updateConfig({ xField: text })}
              placeholder="x"
              placeholderTextColor={theme.colors.mutedForeground}
              style={styles.input}
              value={config.xField ?? ""}
            />
          </View>
          <View style={styles.fieldCol}>
            <Text
              style={[
                styles.fieldLabel,
                { color: theme.colors.mutedForeground },
              ]}
            >
              Y Field
            </Text>
            <TextInput
              onChangeText={(text) => updateConfig({ yField: text })}
              placeholder="y"
              placeholderTextColor={theme.colors.mutedForeground}
              style={styles.input}
              value={config.yField ?? ""}
            />
          </View>
        </View>
      )}

      {showNameValue && (
        <View style={styles.fieldRow}>
          <View style={styles.fieldCol}>
            <Text
              style={[
                styles.fieldLabel,
                { color: theme.colors.mutedForeground },
              ]}
            >
              Name Key
            </Text>
            <TextInput
              onChangeText={(text) => updateConfig({ nameKey: text })}
              placeholder="name"
              placeholderTextColor={theme.colors.mutedForeground}
              style={styles.input}
              value={config.nameKey ?? ""}
            />
          </View>
          <View style={styles.fieldCol}>
            <Text
              style={[
                styles.fieldLabel,
                { color: theme.colors.mutedForeground },
              ]}
            >
              Value Key
            </Text>
            <TextInput
              onChangeText={(text) => updateConfig({ valueKey: text })}
              placeholder="value"
              placeholderTextColor={theme.colors.mutedForeground}
              style={styles.input}
              value={config.valueKey ?? ""}
            />
          </View>
        </View>
      )}

      <View style={styles.switchRow}>
        <Text
          style={[styles.switchLabel, { color: theme.colors.mutedForeground }]}
        >
          Show Legend
        </Text>
        <Switch
          onValueChange={(checked) => updateConfig({ showLegend: checked })}
          value={config.showLegend !== false}
        />
      </View>

      <View style={styles.switchRow}>
        <Text
          style={[styles.switchLabel, { color: theme.colors.mutedForeground }]}
        >
          Show Grid
        </Text>
        <Switch
          onValueChange={(checked) => updateConfig({ showGrid: checked })}
          value={config.showGrid !== false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: theme.spacing[4],
    backgroundColor: theme.colors.muted,
  },
  section: {
    gap: theme.spacing[2],
  },
  sectionLabel: {
    fontSize: 11,
  },
  typeScroll: {
    marginHorizontal: -theme.spacing[1],
  },
  typeRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: theme.spacing[1],
  },
  typeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  typeButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}1a`,
  },
  typeButtonText: {
    fontSize: 11,
    color: theme.colors.mutedForeground,
  },
  typeButtonTextActive: {
    color: theme.colors.primary,
  },
  input: {
    fontSize: 13,
    color: theme.colors.foreground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.colors.background,
  },
  fieldRow: {
    flexDirection: "row",
    gap: theme.spacing[3],
  },
  fieldCol: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    fontSize: 11,
  },
}));
