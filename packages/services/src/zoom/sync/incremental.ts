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

export type ZoomIncrementalSyncOptions = {
  cursor: ZoomSyncCursor;
  batchSize?: number;
  syncRecordings?: boolean;
  syncTranscripts?: boolean;
  syncPastMeetings?: boolean;
  lookbackDays?: number;
  includeUsers?: string[];
  excludeUsers?: string[];
  recordingTypesFilter?: string[];
};

export async function* zoomIncrementalSync(
  client: ZoomClient,
  context: ZoomTransformContext,
  options: ZoomIncrementalSyncOptions
): AsyncGenerator<ZoomSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 50;
  const syncRecordings = options.syncRecordings ?? true;
  const syncTranscripts = options.syncTranscripts ?? true;
  const syncPastMeetings = options.syncPastMeetings ?? true;
  const recordingFilterSet = options.recordingTypesFilter?.length
    ? new Set(options.recordingTypesFilter)
    : undefined;

  const sinceTime = options.cursor.lastSyncTime ?? Date.now() - 86_400_000;
  const fromDate = formatDate(new Date(sinceTime));
  const toDate = formatDate(new Date());

  let batch: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let latestTime = sinceTime;

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
              const meetingTime = meeting.start_time
                ? new Date(meeting.start_time).getTime()
                : 0;
              if (meetingTime <= sinceTime) {
                skipped += 1;
                continue;
              }

              try {
                batch.push(transformZoomMeeting(meeting, context, user.email));
                processed += 1;
                if (meetingTime > latestTime) {
                  latestTime = meetingTime;
                }
              } catch (error) {
                logger.error(
                  { error, meetingId: meeting.id },
                  "Error transforming Zoom meeting (incremental)"
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
            "Failed to fetch incremental meetings"
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
              const recTime = recording.start_time
                ? new Date(recording.start_time).getTime()
                : 0;
              if (recTime <= sinceTime) {
                skipped += 1;
                continue;
              }

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
                if (recTime > latestTime) {
                  latestTime = recTime;
                }

                if (syncTranscripts) {
                  const transcriptFile = (recording.recording_files ?? []).find(
                    (f) => f.file_type === "TRANSCRIPT"
                  );

                  if (transcriptFile?.download_url) {
                    try {
                      const vtt = await downloadTranscriptVtt(
                        client,
                        transcriptFile.download_url
                      );
                      if (vtt?.startsWith("WEBVTT")) {
                        batch.push(
                          transformZoomTranscript(recording, vtt, context)
                        );
                        processed += 1;
                      }
                    } catch (error) {
                      logger.warn(
                        { error, recordingId: recording.uuid },
                        "Failed to download transcript (incremental)"
                      );
                    }
                  }
                }
              } catch (error) {
                logger.error(
                  { error, recordingId: recording.uuid },
                  "Error transforming Zoom recording (incremental)"
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
            "Failed to fetch incremental recordings"
          );
        }
      }
    }
  }

  const cursor: ZoomSyncCursor = {
    lastSyncTime: latestTime,
    lastFullSync: options.cursor.lastFullSync,
  };

  yield {
    items: batch,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
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
    },
    hasMore,
    stats,
  };
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
