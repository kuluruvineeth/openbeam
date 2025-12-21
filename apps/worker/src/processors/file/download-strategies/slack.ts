import { decryptIfEncrypted } from "@openplane/db";
import type {
  DownloadContext,
  DownloadJobMetadata,
  DownloadResult,
  DownloadStrategyHandler,
} from "./types";

function isSlackMetadata(
  metadata: DownloadJobMetadata
): metadata is { connector: "slack"; sourceUrl: string } {
  return metadata.connector === "slack";
}

export const slackDownloadStrategy: DownloadStrategyHandler = {
  canHandle(metadata: DownloadJobMetadata): boolean {
    return isSlackMetadata(metadata);
  },

  async download(
    context: DownloadContext,
    metadata: DownloadJobMetadata
  ): Promise<DownloadResult> {
    if (!isSlackMetadata(metadata)) {
      throw new Error("Invalid metadata for Slack download strategy");
    }

    const oauth = context.connector.oauthProvider;
    if (!oauth) {
      throw new Error("Connector OAuth provider not found");
    }

    const syncToken = decryptIfEncrypted(
      oauth.syncAccessToken,
      oauth.syncAccessTokenIv
    );
    const botToken = decryptIfEncrypted(oauth.accessToken, oauth.accessTokenIv);
    const downloadToken = syncToken ?? botToken;

    if (!downloadToken) {
      throw new Error("Connector access token not found");
    }

    const response = await fetch(metadata.sourceUrl, {
      headers: {
        Authorization: `Bearer ${downloadToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Slack download failed: ${response.status}`);
    }

    const content = await response.arrayBuffer();
    return { buffer: Buffer.from(content) };
  },
};
