import prisma, { decryptIfEncrypted } from "@openplane/db";
import {
  getGoogleDriveServiceAccountToken,
  parseServiceAccountCredentials,
} from "@openplane/integrations";
import type {
  DriveMediaInfo,
  GoogleDriveDomainSyncCursor,
  GoogleDriveSyncBatch,
  GoogleDriveTransformContext,
} from "@openplane/types/services/connectors/google-drive";
import type { GenericDocument } from "@openplane/vespa";
import { logger } from "../../lib/logger";
import { listAllSharedDrives } from "../api/drives";
import { createGoogleDriveClient, type GoogleDriveClient } from "../client";
import {
  googleDriveIncrementalSync,
  type IncrementalSyncOptions,
} from "./incremental";

export interface DomainSyncOptions {
  cursor?: GoogleDriveDomainSyncCursor;
  batchSize?: number;
  indexMedia?: boolean;
  extractContent?: boolean;
  onMediaDiscovered?: (media: DriveMediaInfo[]) => Promise<void>;
  onDocumentsRemoved?: (documentIds: string[]) => Promise<void>;
}

export async function* syncDomainDrives(
  connectorId: string,
  context: Omit<GoogleDriveTransformContext, "userEmail">,
  options: DomainSyncOptions = {}
): AsyncGenerator<
  GoogleDriveSyncBatch<GenericDocument>,
  { cursor: GoogleDriveDomainSyncCursor },
  undefined
> {
  const {
    cursor = { users: {}, sharedDrives: {} },
    batchSize = 100,
    indexMedia = true,
    extractContent = true,
    onMediaDiscovered,
    onDocumentsRemoved,
  } = options;

  const connector = await prisma.connector.findUnique({
    where: { id: connectorId },
    include: { oauthProvider: true },
  });

  if (!connector) {
    throw new Error(`Connector ${connectorId} not found`);
  }

  const credentialsJson = decryptIfEncrypted(
    connector.encryptedCredentials,
    connector.credentialsIv
  );

  if (!credentialsJson) {
    throw new Error("Service account credentials not found");
  }

  const config = connector.config as { delegatedEmail?: string } | null;
  const delegatedEmail = config?.delegatedEmail;

  if (!delegatedEmail) {
    throw new Error("Delegated admin email not configured");
  }

  const credentials = parseServiceAccountCredentials(credentialsJson);

  const adminToken = await getGoogleDriveServiceAccountToken({
    credentials,
    delegatedUserEmail: delegatedEmail,
  });

  const adminClient = createGoogleDriveClient({
    accessToken: adminToken.accessToken,
    connectorId,
    userEmail: delegatedEmail,
  });

  const adminContext: GoogleDriveTransformContext = {
    ...context,
    userEmail: delegatedEmail,
  };

  const adminCursor = cursor.users[delegatedEmail];
  const syncOptions: IncrementalSyncOptions = {
    cursor: adminCursor,
    batchSize,
    includeSharedDrives: true,
    indexMedia,
    extractContent,
    onMediaDiscovered,
    onDocumentsRemoved,
  };

  for await (const batch of googleDriveIncrementalSync(
    adminClient,
    adminContext,
    syncOptions
  )) {
    cursor.users[delegatedEmail] = batch.cursor;
    yield batch;
  }

  const sharedDrives = await listAllSharedDrives(adminClient, {
    useDomainAdminAccess: true,
  });

  logger.info(
    { driveCount: sharedDrives.length },
    "Found shared drives in domain"
  );

  for (const drive of sharedDrives) {
    const driveCursor = cursor.sharedDrives[drive.id];

    try {
      const driveClient = await createDriveClient(
        credentials,
        delegatedEmail,
        connectorId
      );

      for await (const batch of googleDriveIncrementalSync(
        driveClient,
        adminContext,
        {
          cursor: driveCursor,
          batchSize,
          includeSharedDrives: false,
          indexMedia,
          extractContent,
          onMediaDiscovered,
          onDocumentsRemoved,
        }
      )) {
        cursor.sharedDrives[drive.id] = batch.cursor;
        yield batch;
      }
    } catch (error) {
      logger.error(
        { error, driveId: drive.id, driveName: drive.name },
        "Failed to sync shared drive"
      );
    }
  }

  cursor.lastUserListSync = Date.now();

  return { cursor };
}

async function createDriveClient(
  credentials: ReturnType<typeof parseServiceAccountCredentials>,
  delegatedEmail: string,
  connectorId: string
): Promise<GoogleDriveClient> {
  const token = await getGoogleDriveServiceAccountToken({
    credentials,
    delegatedUserEmail: delegatedEmail,
  });

  return createGoogleDriveClient({
    accessToken: token.accessToken,
    connectorId,
    userEmail: delegatedEmail,
  });
}

export function createInitialDomainCursor(): GoogleDriveDomainSyncCursor {
  return {
    users: {},
    sharedDrives: {},
    lastUserListSync: undefined,
  };
}
