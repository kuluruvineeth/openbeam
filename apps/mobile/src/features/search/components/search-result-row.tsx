import { Heart, MessageSquare, Paperclip } from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { getDocumentIcon, getDocumentTypeLabel } from "../lib/display";
import {
  formatFileSize,
  formatRelativeTime,
  getContentPreview,
} from "../lib/format";
import type { SearchResultDocument } from "../types";

type SearchResultRowProps = {
  document: SearchResultDocument;
  onPress?: (doc: SearchResultDocument) => void;
};

export function SearchResultRow({
  document: doc,
  onPress,
}: SearchResultRowProps) {
  const { theme } = useUnistyles();

  const DocIcon = useMemo(
    () => getDocumentIcon(doc.connector_type, doc.document_type, doc.mime_type),
    [doc.connector_type, doc.document_type, doc.mime_type]
  );

  const typeLabel = getDocumentTypeLabel(
    doc.connector_type,
    doc.document_type,
    doc.mime_type
  );

  const contentPreview = getContentPreview(doc.content || "");
  const displayTitle = doc.file_name || doc.title;

  const reactions = doc.reaction_count ?? 0;
  const replies = doc.reply_count ?? 0;
  const attachments = doc.attachments?.length ?? 0;

  return (
    <Pressable onPress={() => onPress?.(doc)} style={styles.container}>
      <View style={styles.iconContainer}>
        <DocIcon
          color={theme.colors.mutedForeground}
          size={14}
          strokeWidth={1.5}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text muted style={styles.typeLabel} variant="caption">
            {typeLabel.toUpperCase()}
          </Text>
          {doc.source_name && (
            <>
              <Text muted variant="caption">
                ·
              </Text>
              <Text
                muted
                numberOfLines={1}
                style={styles.sourceName}
                variant="caption"
              >
                {doc.source_name}
              </Text>
            </>
          )}
          <Text muted style={styles.date} variant="caption">
            {formatRelativeTime(doc.created_at)}
          </Text>
        </View>

        {displayTitle && (
          <Text numberOfLines={1} variant="body">
            {displayTitle}
          </Text>
        )}

        {contentPreview ? (
          <Text
            muted
            numberOfLines={2}
            style={styles.preview}
            variant="caption"
          >
            {contentPreview}
          </Text>
        ) : null}

        {(reactions > 0 || replies > 0 || attachments > 0 || doc.file_size) && (
          <View style={styles.metadata}>
            {reactions > 0 && (
              <View style={styles.metaItem}>
                <Heart
                  color={theme.colors.mutedForeground}
                  size={10}
                  strokeWidth={1.5}
                />
                <Text muted variant="caption">
                  {reactions}
                </Text>
              </View>
            )}
            {replies > 0 && (
              <View style={styles.metaItem}>
                <MessageSquare
                  color={theme.colors.mutedForeground}
                  size={10}
                  strokeWidth={1.5}
                />
                <Text muted variant="caption">
                  {replies}
                </Text>
              </View>
            )}
            {attachments > 0 && (
              <View style={styles.metaItem}>
                <Paperclip
                  color={theme.colors.mutedForeground}
                  size={10}
                  strokeWidth={1.5}
                />
                <Text muted variant="caption">
                  {attachments}
                </Text>
              </View>
            )}
            {doc.file_size ? (
              <Text muted style={styles.fileSize} variant="caption">
                {formatFileSize(doc.file_size)}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: theme.spacing[4],
    paddingVertical: 10,
    gap: theme.spacing[3],
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${theme.colors.foreground}06`,
    borderRadius: 6,
  },
  content: {
    flex: 1,
    gap: theme.spacing[1],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  typeLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
    color: theme.colors.mutedForeground,
  },
  sourceName: {
    maxWidth: 120,
    fontSize: 10,
  },
  date: {
    marginLeft: "auto",
    fontSize: 10,
    fontVariant: ["tabular-nums"],
  },
  preview: {
    fontSize: 12,
    lineHeight: 18,
  },
  metadata: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    marginTop: 2,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  fileSize: {
    fontSize: 10,
    fontVariant: ["tabular-nums"],
  },
}));
