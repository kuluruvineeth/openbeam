import { ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import type { WorkspaceQueryResult } from "../lib";

type DataTableViewProps = {
  result: WorkspaceQueryResult;
};

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function DataTableView({ result }: DataTableViewProps) {
  const { columns, rows, rowCount, queryTimeMs } = result;

  return (
    <View style={styles.container}>
      <View style={styles.stats}>
        <Text style={styles.statsText}>
          {rowCount} row{rowCount !== 1 ? "s" : ""} in {queryTimeMs}ms
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={styles.headerRow}>
            {columns.map((col) => (
              <View key={col.name} style={styles.headerCell}>
                <Text numberOfLines={1} style={styles.headerText}>
                  {col.name}
                </Text>
                <Text style={styles.typeText}>{col.type}</Text>
              </View>
            ))}
          </View>

          <ScrollView>
            {rows.map((row, rowIdx) => (
              <View
                // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
                key={rowIdx}
                style={[styles.dataRow, rowIdx % 2 === 0 && styles.dataRowAlt]}
              >
                {columns.map((col) => (
                  <View key={col.name} style={styles.dataCell}>
                    <Text numberOfLines={2} style={styles.cellText}>
                      {formatCellValue(row[col.name])}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  stats: {
    padding: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statsText: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
  },
  headerCell: {
    width: 140,
    padding: theme.spacing[2],
    gap: 2,
  },
  headerText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  typeText: {
    fontSize: 10,
    color: theme.colors.mutedForeground,
  },
  dataRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dataRowAlt: {
    backgroundColor: theme.colors.muted,
  },
  dataCell: {
    width: 140,
    padding: theme.spacing[2],
  },
  cellText: {
    fontSize: 13,
    color: theme.colors.foreground,
  },
}));
