import { Download, FileJson, FileText, Upload } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";

type ImportExportScreenProps = {
  objectName: string;
  onImport: (data: string, format: "csv" | "json") => void;
  onExport: (format: "csv" | "json") => void;
  isImporting: boolean;
  isExporting: boolean;
};

type FormatOption = "csv" | "json";

export function ImportExportScreen({
  objectName,
  onImport,
  onExport,
  isImporting,
  isExporting,
}: ImportExportScreenProps) {
  const [activeTab, setActiveTab] = useState<"import" | "export">("import");
  const [format, setFormat] = useState<FormatOption>("csv");
  const [importData, setImportData] = useState("");

  function handleImport() {
    if (!importData.trim()) {
      Alert.alert("No data", "Paste your data to import.");
      return;
    }
    onImport(importData.trim(), format);
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setActiveTab("import")}
          style={[styles.tab, activeTab === "import" && styles.tabActive]}
        >
          <Upload
            color={activeTab === "import" ? "#3b82f6" : "#6b7280"}
            size={14}
            strokeWidth={2}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "import" && styles.tabTextActive,
            ]}
          >
            Import
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("export")}
          style={[styles.tab, activeTab === "export" && styles.tabActive]}
        >
          <Download
            color={activeTab === "export" ? "#3b82f6" : "#6b7280"}
            size={14}
            strokeWidth={2}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "export" && styles.tabTextActive,
            ]}
          >
            Export
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.objectLabel}>Object: {objectName}</Text>

        <Text style={styles.sectionLabel}>Format</Text>
        <View style={styles.formatRow}>
          <Pressable
            onPress={() => setFormat("csv")}
            style={[
              styles.formatOption,
              format === "csv" && styles.formatSelected,
            ]}
          >
            <FileText
              color={format === "csv" ? "#3b82f6" : "#6b7280"}
              size={16}
              strokeWidth={1.5}
            />
            <Text
              style={[
                styles.formatText,
                format === "csv" && styles.formatTextSelected,
              ]}
            >
              CSV
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFormat("json")}
            style={[
              styles.formatOption,
              format === "json" && styles.formatSelected,
            ]}
          >
            <FileJson
              color={format === "json" ? "#3b82f6" : "#6b7280"}
              size={16}
              strokeWidth={1.5}
            />
            <Text
              style={[
                styles.formatText,
                format === "json" && styles.formatTextSelected,
              ]}
            >
              JSON
            </Text>
          </Pressable>
        </View>

        {activeTab === "import" ? (
          <>
            <Text style={styles.sectionLabel}>Paste data</Text>
            <TextInput
              multiline
              numberOfLines={10}
              onChangeText={setImportData}
              placeholder={
                format === "csv"
                  ? "name,email,status\nJohn,john@example.com,active"
                  : '[{"name":"John","email":"john@example.com"}]'
              }
              placeholderTextColor="#9ca3af"
              style={styles.dataInput}
              textAlignVertical="top"
              value={importData}
            />
            <Pressable
              disabled={isImporting || !importData.trim()}
              onPress={handleImport}
              style={[
                styles.actionButton,
                (!importData.trim() || isImporting) && styles.actionDisabled,
              ]}
            >
              <Upload color="#ffffff" size={16} strokeWidth={2} />
              <Text style={styles.actionButtonText}>
                {isImporting ? "Importing..." : "Import Data"}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.exportHint}>
              Export all entries from {objectName} as {format.toUpperCase()}.
            </Text>
            <Pressable
              disabled={isExporting}
              onPress={() => onExport(format)}
              style={[
                styles.actionButton,
                isExporting && styles.actionDisabled,
              ]}
            >
              <Download color="#ffffff" size={16} strokeWidth={2} />
              <Text style={styles.actionButtonText}>
                {isExporting
                  ? "Exporting..."
                  : `Export as ${format.toUpperCase()}`}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[3],
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  tabTextActive: {
    color: "#3b82f6",
  },
  content: {
    padding: theme.spacing[4],
    gap: theme.spacing[4],
  },
  objectLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.foreground,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  formatRow: {
    flexDirection: "row",
    gap: theme.spacing[3],
  },
  formatOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[2],
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  formatSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  formatText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6b7280",
  },
  formatTextSelected: {
    color: "#3b82f6",
  },
  dataInput: {
    height: 200,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: theme.spacing[3],
    fontFamily: "monospace",
    fontSize: 12,
    color: theme.colors.foreground,
    backgroundColor: theme.colors.card,
  },
  exportHint: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.mutedForeground,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[3],
    backgroundColor: "#3b82f6",
    borderRadius: 6,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
}));
