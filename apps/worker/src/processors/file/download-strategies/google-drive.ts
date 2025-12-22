import { decryptIfEncrypted } from "@openplane/db";
import { createGoogleDriveClient } from "@openplane/services";
import type {
  DownloadContext,
  DownloadJobMetadata,
  DownloadResult,
  DownloadStrategyHandler,
} from "./types";

function isGoogleDriveMetadata(metadata: DownloadJobMetadata): metadata is {
  connector: "google-drive";
  fileId: string;
  exportMimeType?: string;
} {
  return metadata.connector === "google-drive";
}

export const googleDriveDownloadStrategy: DownloadStrategyHandler = {
  canHandle(metadata: DownloadJobMetadata): boolean {
    return isGoogleDriveMetadata(metadata);
  },

  async download(
    context: DownloadContext,
    metadata: DownloadJobMetadata
  ): Promise<DownloadResult> {
    if (!isGoogleDriveMetadata(metadata)) {
      throw new Error("Invalid metadata for Google Drive download strategy");
    }

    const oauth = context.connector.oauthProvider;
    if (!oauth) {
      throw new Error("Connector OAuth provider not found");
    }

    const accessToken = decryptIfEncrypted(
      oauth.accessToken,
      oauth.accessTokenIv
    );
    if (!accessToken) {
      throw new Error("Connector access token not found");
    }

    const client = createGoogleDriveClient({
      accessToken,
      connectorId: context.connectorId,
    });

    // Google Workspace docs need export, binary files use direct download
    if (metadata.exportMimeType) {
      const text = await client.export(
        metadata.fileId,
        metadata.exportMimeType
      );
      return { buffer: Buffer.from(text, "utf-8") };
    }

    const arrayBuffer = await client.download(metadata.fileId);
    return { buffer: Buffer.from(arrayBuffer) };
  },
};
