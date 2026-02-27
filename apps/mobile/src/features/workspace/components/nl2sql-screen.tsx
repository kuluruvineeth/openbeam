import { Code, Send, Sparkles } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { useWorkspace } from "../hooks";
import { DataTableView } from "./data-table-view";

type NL2SQLScreenProps = {
  objectName?: string;
};

export function NL2SQLScreen({ objectName }: NL2SQLScreenProps) {
  const [question, setQuestion] = useState("");
  const {
    nl2sqlResult,
    isGeneratingSQL,
    queryResult,
    isQuerying,
    askQuestion,
    runQuery,
  } = useWorkspace();

  function handleAsk() {
    if (!question.trim()) {
      return;
    }
    askQuestion(question.trim(), objectName);
  }

  function handleRunSQL() {
    if (!nl2sqlResult?.sql) {
      return;
    }
    runQuery(nl2sqlResult.sql);
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputSection}>
        <Sparkles color="#8b5cf6" size={18} strokeWidth={2} />
        <TextInput
          onChangeText={setQuestion}
          onSubmitEditing={handleAsk}
          placeholder="Ask a question about your data..."
          placeholderTextColor="#9ca3af"
          returnKeyType="send"
          style={styles.input}
          value={question}
        />
        <Pressable
          disabled={!question.trim() || isGeneratingSQL}
          onPress={handleAsk}
          style={[
            styles.sendButton,
            !question.trim() && styles.sendButtonDisabled,
          ]}
        >
          {isGeneratingSQL ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Send color="#ffffff" size={16} strokeWidth={2} />
          )}
        </Pressable>
      </View>

      {nl2sqlResult && (
        <View style={styles.resultSection}>
          <Text style={styles.explanation}>{nl2sqlResult.explanation}</Text>

          <View style={styles.sqlBlock}>
            <View style={styles.sqlHeader}>
              <Code color="#9ca3af" size={14} strokeWidth={2} />
              <Text style={styles.sqlLabel}>Generated SQL</Text>
              <View style={styles.complexityBadge}>
                <Text style={styles.complexityText}>
                  {nl2sqlResult.estimatedComplexity}
                </Text>
              </View>
            </View>
            <Text style={styles.sqlText}>{nl2sqlResult.sql}</Text>
          </View>

          <Pressable
            disabled={isQuerying}
            onPress={handleRunSQL}
            style={styles.runButton}
          >
            <Text style={styles.runButtonText}>
              {isQuerying ? "Running..." : "Run Query"}
            </Text>
          </Pressable>
        </View>
      )}

      {queryResult && (
        <View style={styles.tableSection}>
          <DataTableView result={queryResult} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  inputSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    padding: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: theme.colors.foreground,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  resultSection: {
    padding: theme.spacing[4],
    gap: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  explanation: {
    fontSize: 14,
    color: theme.colors.foreground,
    lineHeight: 20,
  },
  sqlBlock: {
    backgroundColor: theme.colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  sqlHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    padding: theme.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sqlLabel: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  complexityBadge: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
  },
  complexityText: {
    fontSize: 10,
    fontWeight: "500",
    color: theme.colors.mutedForeground,
    textTransform: "capitalize",
  },
  sqlText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: theme.colors.foreground,
    padding: theme.spacing[3],
    lineHeight: 18,
  },
  runButton: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    backgroundColor: "#3b82f6",
    borderRadius: 6,
  },
  runButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
  },
  tableSection: {
    flex: 1,
  },
}));
