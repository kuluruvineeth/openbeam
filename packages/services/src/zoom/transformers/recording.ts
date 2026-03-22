import type {
  ZoomRecording,
  ZoomTransformContext,
} from "@openbeam/types/services/connectors/zoom";
import type { GenericDocument } from "@openbeam/vespa";

export function transformZoomRecording(
  recording: ZoomRecording,
  context: ZoomTransformContext
): GenericDocument {
  const files = recording.recording_files ?? [];
  const videoFiles = files.filter(
    (f) => f.file_type !== "TRANSCRIPT" && f.file_type !== "TIMELINE"
  );

  const contentParts: string[] = [];
  if (recording.topic) {
    contentParts.push(recording.topic);
  }
  if (recording.duration) {
    contentParts.push(`Duration: ${recording.duration} minutes`);
  }

  const fileTypeSummary = videoFiles
    .map((f) => f.recording_type ?? f.file_type)
    .filter(Boolean)
    .join(", ");
  if (fileTypeSummary) {
    contentParts.push(`Recording types: ${fileTypeSummary}`);
  }

  const createdAt = recording.start_time
    ? new Date(recording.start_time).getTime()
    : Date.now();

  return {
    id: `${context.connectorId}_recording_${recording.uuid}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: recording.uuid,
    document_type: "recording",
    title: recording.topic || `Recording ${recording.id}`,
    content: contentParts.join("\n\n"),
    author_email: recording.host_email,
    created_at: createdAt,
    updated_at: createdAt,
    url: recording.share_url ?? `https://zoom.us/recording/${recording.id}`,
    is_public: false,
    access_control: [],
    metadata: {
      meetingId: String(recording.id),
      ...(recording.duration && {
        duration: String(recording.duration),
      }),
      ...(recording.total_size && {
        totalSize: String(recording.total_size),
      }),
      ...(fileTypeSummary && { recordingTypes: fileTypeSummary }),
      fileCount: String(videoFiles.length),
    },
  };
}

export function transformZoomTranscript(
  recording: ZoomRecording,
  transcriptText: string,
  context: ZoomTransformContext
): GenericDocument {
  const cleanedText = parseVttToPlainText(transcriptText);
  const createdAt = recording.start_time
    ? new Date(recording.start_time).getTime()
    : Date.now();

  return {
    id: `${context.connectorId}_transcript_${recording.uuid}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: `${recording.uuid}_transcript`,
    document_type: "transcript",
    title: `Transcript: ${recording.topic || `Meeting ${recording.id}`}`,
    content: cleanedText,
    author_email: recording.host_email,
    created_at: createdAt,
    updated_at: createdAt,
    url: recording.share_url ?? `https://zoom.us/recording/${recording.id}`,
    is_public: false,
    access_control: [],
    metadata: {
      meetingId: String(recording.id),
      meetingTopic: recording.topic,
      ...(recording.duration && {
        duration: String(recording.duration),
      }),
      sourceType: "vtt",
    },
  };
}

const VTT_CUE_INDEX_PATTERN = /^\d+$/;

function parseVttToPlainText(vtt: string): string {
  const lines = vtt.split("\n");
  const textLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed === "" ||
      trimmed === "WEBVTT" ||
      trimmed.includes("-->") ||
      VTT_CUE_INDEX_PATTERN.test(trimmed)
    ) {
      continue;
    }
    textLines.push(trimmed);
  }

  return textLines.join(" ");
}
