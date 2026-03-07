import type { TwelveLabsClient } from "@openbeam/media";
import type {
  MediaSegment,
  ProcessMediaInput,
  ProcessMediaOutput,
} from "./types";

export interface ProcessMediaDependencies {
  twelvelabs: TwelveLabsClient;
  indexId: string;
}

export function createProcessMediaActivity(deps: ProcessMediaDependencies) {
  const { twelvelabs, indexId } = deps;

  return async function processMedia(
    input: ProcessMediaInput
  ): Promise<ProcessMediaOutput> {
    const videoId = await twelvelabs.indexVideo(indexId, input.path, {
      enableVideoStream: true,
    });

    const [transcript, metadata] = await Promise.all([
      twelvelabs.getVideoTranscriptWithTimestamps(indexId, videoId),
      twelvelabs.generateMetadata(indexId, videoId),
    ]);

    const chapters = metadata.chapters ?? [];
    const segments: MediaSegment[] = transcript.map(
      (item: { start: number; end: number; value: string }) => ({
        start: item.start,
        end: item.end,
        transcription: item.value,
        scenes: chapters
          .filter(
            (ch: { start: number; end: number }) =>
              ch.start <= item.start && ch.end >= item.end
          )
          .map((ch: { title: string }) => ch.title),
      })
    );

    return {
      segments,
      duration: metadata.duration,
    };
  };
}
