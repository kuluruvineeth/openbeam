import type {
  ZoomSyncBatch,
  ZoomSyncCursor,
  ZoomTransformContext,
} from "@openbeam/types/services/connectors/zoom";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import {
  downloadTranscriptVtt,
  getAllUsers,
  getUserPastMeetings,
  getUserRecordings,
} from "../api";
import type { ZoomClient } from "../client";
import { transformZoomMeeting } from "../transformers/meeting";
import {
  transformZoomRecording,
  transformZoomTranscript,
} from "../transformers/recording";

export type ZoomFullSyncOptions = {
  batchSize?: number;
  syncRecordings?: boolean;
  syncTranscripts?: boolean;
  syncPastMeetings?: boolean;
  lookbackDays?: number;
  includeUsers?: string[];
  excludeUsers?: string[];
  recordingTypesFilter?: string[];
};

export async function* zoomFullSync(
  client: ZoomClient,
  context: ZoomTransformContext,
  options: ZoomFullSyncOptions = {}
): AsyncGenerator<ZoomSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 50;
  const syncRecordings = options.syncRecordings ?? true;
  const syncTranscripts = options.syncTranscripts ?? true;
  const syncPastMeetings = options.syncPastMeetings ?? true;
  const lookbackDays = options.lookbackDays ?? 90;
  const recordingFilterSet = options.recordingTypesFilter?.length
    ? new Set(options.recordingTypesFilter)
    : undefined;

  let batch: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let latestTime = 0;

  const fromDate = formatDate(new Date(Date.now() - lookbackDays * 86_400_000));
  const toDate = formatDate(new Date());

  for await (const users of getAllUsers(
    client,
    options.includeUsers,
    options.excludeUsers
  )) {
    for (const user of users) {
      if (syncPastMeetings) {
        try {
          for await (const meetings of getUserPastMeetings(
            client,
            user.id,
            fromDate
          )) {
            for (const meeting of meetings) {
              try {
                batch.push(transformZoomMeeting(meeting, context, user.email));
                processed += 1;
                latestTime = trackTime(meeting.start_time, latestTime);
              } catch (error) {
                logger.error(
                  { error, meetingId: meeting.id },
                  "Error transforming Zoom meeting"
                );
                errors += 1;
              }
            }

            if (batch.length >= batchSize) {
              yield makeBatch(
                batch,
                { processed, skipped, errors },
                true,
                latestTime
              );
              batch = [];
            }
          }
        } catch (error) {
          logger.warn(
            { error, userId: user.id },
            "Failed to fetch meetings for user"
          );
        }
      }

      if (syncRecordings) {
        try {
          for await (const recordings of getUserRecordings(
            client,
            user.id,
            fromDate,
            toDate
          )) {
            for (const recording of recordings) {
              try {
                if (recordingFilterSet) {
                  const hasMatch = (recording.recording_files ?? []).some(
                    (f) =>
                      f.recording_type &&
                      recordingFilterSet.has(f.recording_type)
                  );
                  if (!hasMatch) {
                    skipped += 1;
                    continue;
                  }
                }

                batch.push(transformZoomRecording(recording, context));
                processed += 1;
                latestTime = trackTime(recording.start_time, latestTime);

                if (syncTranscripts) {
                  const transcriptDoc = await tryDownloadTranscript(
                    client,
                    recording,
                    context
                  );
                  if (transcriptDoc) {
                    batch.push(transcriptDoc);
                    processed += 1;
                  }
                }
              } catch (error) {
                logger.error(
                  { error, recordingId: recording.uuid },
                  "Error transforming Zoom recording"
                );
                errors += 1;
              }
            }

            if (batch.length >= batchSize) {
              yield makeBatch(
                batch,
                { processed, skipped, errors },
                true,
                latestTime
              );
              batch = [];
            }
          }
        } catch (error) {
          logger.warn(
            { error, userId: user.id },
            "Failed to fetch recordings for user"
          );
        }
      }
    }
  }

  const cursor: ZoomSyncCursor = {
    lastSyncTime: latestTime || Date.now(),
    lastFullSync: Date.now(),
  };

  yield {
    items: batch,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}

async function tryDownloadTranscript(
  client: ZoomClient,
  recording: {
    uuid: string;
    recording_files?: Array<{ file_type: string; download_url?: string }>;
  } & Record<string, unknown>,
  context: ZoomTransformContext
): Promise<GenericDocument | null> {
  const transcriptFile = (recording.recording_files ?? []).find(
    (f) => f.file_type === "TRANSCRIPT"
  );

  if (!transcriptFile?.download_url) {
    return null;
  }

  try {
    const vtt = await downloadTranscriptVtt(
      client,
      transcriptFile.download_url
    );
    if (vtt?.startsWith("WEBVTT")) {
      return transformZoomTranscript(
        recording as Parameters<typeof transformZoomTranscript>[0],
        vtt,
        context
      );
    }
  } catch (error) {
    logger.warn(
      { error, recordingId: recording.uuid },
      "Failed to download transcript"
    );
  }
  return null;
}

function makeBatch(
  items: GenericDocument[],
  stats: { processed: number; skipped: number; errors: number },
  hasMore: boolean,
  latestTime: number
): ZoomSyncBatch<GenericDocument> {
  return {
    items,
    cursor: {
      lastSyncTime: latestTime || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore,
    stats,
  };
}

function trackTime(isoString: string | undefined, current: number): number {
  if (!isoString) {
    return current;
  }
  const ts = new Date(isoString).getTime();
  return ts > current ? ts : current;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
