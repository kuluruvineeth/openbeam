import type { TwelveLabsClient } from "@openbeam/media";

export interface ExtractTranscriptDependencies {
  twelvelabs: TwelveLabsClient;
  indexId: string;
}

export function createExtractTranscriptActivity(
  deps: ExtractTranscriptDependencies
) {
  const { twelvelabs, indexId } = deps;

  return async function extractTranscript(input: {
    path: string;
  }): Promise<string> {
    const videoId = await twelvelabs.indexVideo(indexId, input.path);
    return twelvelabs.getVideoTranscript(indexId, videoId);
  };
}
