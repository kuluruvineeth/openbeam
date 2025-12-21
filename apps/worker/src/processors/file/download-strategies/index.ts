import { gmailDownloadStrategy } from "./gmail";
import { slackDownloadStrategy } from "./slack";
import type {
  DownloadContext,
  DownloadJobMetadata,
  DownloadResult,
  DownloadStrategyHandler,
} from "./types";

export type { DownloadContext, DownloadJobMetadata, DownloadResult };

const strategies: DownloadStrategyHandler[] = [
  slackDownloadStrategy,
  gmailDownloadStrategy,
];

export async function downloadFile(
  context: DownloadContext,
  metadata: DownloadJobMetadata
): Promise<DownloadResult> {
  const strategy = strategies.find((s) => s.canHandle(metadata));
  if (!strategy) {
    throw new Error(
      `No download strategy found for connector: ${metadata.connector}`
    );
  }
  return await strategy.download(context, metadata);
}
