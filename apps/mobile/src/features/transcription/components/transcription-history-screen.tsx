import { Mic, Trash2 } from "lucide-react-native";
import { useCallback } from "react";
import { Alert, FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { EmptyState } from "@/features/layout/components/empty-state";
import {
  type Transcription,
  useTranscriptionStore,
} from "@/stores/transcription-store";
import { TranscriptionItem } from "./transcription-item";

export function TranscriptionHistoryScreen() {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const transcriptions = useTranscriptionStore((s) => s.transcriptions);
  const deleteTranscription = useTranscriptionStore(
    (s) => s.deleteTranscription
  );
  const clearAll = useTranscriptionStore((s) => s.clearAll);

  const handleCopy = useCallback(async (text: string) => {
    try {
      const { Clipboard } = await import("react-native");
      (Clipboard as { setString?: (s: string) => void })?.setString?.(text);
    } catch {
      // Clipboard not available
    }
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      deleteTranscription(id);
    },
    [deleteTranscription]
  );

  const handleClearAll = useCallback(() => {
    Alert.alert(
      "Clear all transcriptions",
      "This will permanently delete your entire transcription history.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear all", style: "destructive", onPress: clearAll },
      ]
    );
  }, [clearAll]);

  const renderItem = useCallback(
    ({ item }: { item: Transcription }) => (
      <TranscriptionItem
        onCopy={handleCopy}
        onDelete={handleDelete}
        transcription={item}
      />
    ),
    [handleCopy, handleDelete]
  );

  const keyExtractor = useCallback((item: Transcription) => item.id, []);

  const renderSeparator = useCallback(
    () => <View style={styles.separator} />,
    []
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transcription History</Text>
        {transcriptions.length > 0 && (
          <Pressable
            accessibilityLabel="Clear all transcriptions"
            hitSlop={8}
            onPress={handleClearAll}
            style={({ pressed }) => [
              styles.clearButton,
              pressed && styles.clearButtonPressed,
            ]}
          >
            <Trash2 color="#ef4444" size={14} />
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        contentContainerStyle={[
          transcriptions.length === 0
            ? styles.emptyContainer
            : styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        data={transcriptions}
        ItemSeparatorComponent={renderSeparator}
        keyExtractor={keyExtractor}
        ListEmptyComponent={
          <EmptyState
            description="Your transcribed recordings will appear here."
            icon={<Mic color={theme.colors.foregroundMuted} size={24} />}
            title="No transcriptions yet"
          />
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearButtonPressed: {
    backgroundColor: theme.colors.muted,
  },
  clearText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#ef4444",
  },
  listContent: {
    paddingVertical: 4,
  },
  emptyContainer: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing[4],
  },
}));
