import { Eye, Play, Users } from "lucide-react-native";
import { Image, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { getConnectorLabel } from "../lib/display";
import { formatDuration, formatRelativeTime } from "../lib/format";
import type { MediaDocument } from "../types";

type SearchMediaRowProps = {
  media: MediaDocument;
  onPress?: (media: MediaDocument) => void;
};

function MediaThumbnail({
  thumbnailUrl,
  duration,
}: {
  thumbnailUrl?: string;
  duration: number;
}) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.thumbnail}>
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={styles.thumbnailImage} />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Play
            color={theme.colors.mutedForeground}
            fill={theme.colors.mutedForeground}
            size={20}
            strokeWidth={1.5}
          />
        </View>
      )}
      <View style={styles.durationBadge}>
        <Text style={styles.durationText} variant="caption">
          {formatDuration(duration)}
        </Text>
      </View>
    </View>
  );
}

export function SearchMediaRow({ media, onPress }: SearchMediaRowProps) {
  const { theme } = useUnistyles();
  const connectorType = media.connector_type || media.source_type;
  const summaryPreview =
    media.media_summary?.length > 120
      ? `${media.media_summary.slice(0, 120)}...`
      : media.media_summary || media.description;

  const viewCount = media.view_count ?? 0;
  const participantCount = media.participants?.length ?? 0;

  return (
    <Pressable onPress={() => onPress?.(media)} style={styles.container}>
      <MediaThumbnail
        duration={media.duration_seconds}
        thumbnailUrl={media.thumbnail_url}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          {connectorType && (
            <Text muted variant="caption">
              {getConnectorLabel(connectorType)}
            </Text>
          )}
          {media.media_type && (
            <>
              <Text muted variant="caption">
                ·
              </Text>
              <Text style={styles.mediaType} variant="caption">
                {media.media_type.toUpperCase()}
              </Text>
            </>
          )}
          <Text muted style={styles.date} variant="caption">
            {formatRelativeTime(media.created_at)}
          </Text>
        </View>

        <Text numberOfLines={1} variant="body">
          {media.title}
        </Text>

        {summaryPreview ? (
          <Text muted numberOfLines={2} variant="caption">
            {summaryPreview}
          </Text>
        ) : null}

        {(media.author_name || viewCount > 0 || participantCount > 0) && (
          <View style={styles.metadata}>
            {media.author_name && (
              <Text muted numberOfLines={1} variant="caption">
                {media.author_name}
              </Text>
            )}
            {participantCount > 0 && (
              <View style={styles.metaItem}>
                <Users
                  color={theme.colors.mutedForeground}
                  size={10}
                  strokeWidth={1.5}
                />
                <Text muted variant="caption">
                  {participantCount}
                </Text>
              </View>
            )}
            {viewCount > 0 && (
              <View style={styles.metaItem}>
                <Eye
                  color={theme.colors.mutedForeground}
                  size={10}
                  strokeWidth={1.5}
                />
                <Text muted variant="caption">
                  {viewCount.toLocaleString()}
                </Text>
              </View>
            )}
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
    paddingVertical: theme.spacing[3],
    gap: theme.spacing[3],
  },
  thumbnail: {
    width: 100,
    height: 56,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: theme.colors.secondary,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  durationBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  durationText: {
    color: "#ffffff",
    fontSize: 10,
    fontVariant: ["tabular-nums"],
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
  mediaType: {
    fontSize: 9,
    letterSpacing: 0.5,
    color: theme.colors.mutedForeground,
  },
  date: {
    marginLeft: "auto",
    fontSize: 10,
    fontVariant: ["tabular-nums"],
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
}));
