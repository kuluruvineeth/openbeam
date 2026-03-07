import type { TwelveLabsClient } from "@openbeam/media";
import { createExtractTranscriptActivity } from "./extract-transcript";
import { createGenerateThumbnailsActivity } from "./generate-thumbnails";
import { createProcessMediaActivity } from "./process-media";
import type {
  MediaActivities,
  MediaSegment,
  ProcessMediaInput,
  ProcessMediaOutput,
} from "./types";

export interface MediaActivityDependencies {
  twelvelabs: TwelveLabsClient;
  indexId: string;
}

export function createMediaActivities(
  deps: MediaActivityDependencies
): MediaActivities {
  return {
    processMedia: createProcessMediaActivity(deps),
    extractTranscript: createExtractTranscriptActivity(deps),
    generateThumbnails: createGenerateThumbnailsActivity(deps),
  };
}

export type {
  MediaActivities,
  ProcessMediaInput,
  ProcessMediaOutput,
  MediaSegment,
};
