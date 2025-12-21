import type { Connector, OAuthProvider } from "@openplane/db";
import type {
  FileDownloadMetadata,
  MediaDownloadMetadata,
} from "@openplane/redis";

export type DownloadJobMetadata = FileDownloadMetadata | MediaDownloadMetadata;

export interface DownloadContext {
  connector: Connector & { oauthProvider?: OAuthProvider | null };
  connectorId: string;
  externalId: string;
  fileName: string;
  mimeType: string;
}

export interface DownloadResult {
  buffer: Buffer;
}

export interface DownloadStrategyHandler {
  canHandle(metadata: DownloadJobMetadata): boolean;
  download(
    context: DownloadContext,
    metadata: DownloadJobMetadata
  ): Promise<DownloadResult>;
}
