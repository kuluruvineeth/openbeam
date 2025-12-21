import { decryptIfEncrypted } from "@openplane/db";
import { createGmailClient, downloadAttachment } from "@openplane/services";
import type {
  DownloadContext,
  DownloadJobMetadata,
  DownloadResult,
  DownloadStrategyHandler,
} from "./types";

function isGmailMetadata(
  metadata: DownloadJobMetadata
): metadata is { connector: "gmail"; messageId: string; attachmentId: string } {
  return metadata.connector === "gmail";
}

export const gmailDownloadStrategy: DownloadStrategyHandler = {
  canHandle(metadata: DownloadJobMetadata): boolean {
    return isGmailMetadata(metadata);
  },

  async download(
    context: DownloadContext,
    metadata: DownloadJobMetadata
  ): Promise<DownloadResult> {
    if (!isGmailMetadata(metadata)) {
      throw new Error("Invalid metadata for Gmail download strategy");
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
      throw new Error("Gmail access token not found");
    }

    const config = context.connector.config as Record<string, unknown> | null;
    const userEmail = (config?.userEmail ?? config?.delegatedEmail) as
      | string
      | undefined;

    const client = createGmailClient({
      accessToken,
      connectorId: context.connectorId,
      userEmail,
    });

    const buffer = await downloadAttachment(
      client,
      metadata.messageId,
      metadata.attachmentId
    );

    if (!buffer) {
      throw new Error(
        `Failed to download Gmail attachment: ${metadata.attachmentId}`
      );
    }

    return { buffer };
  },
};
