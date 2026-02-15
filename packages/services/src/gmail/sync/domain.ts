import prisma, { decryptIfEncrypted, getConnectorForSync } from "@openplane/db";
import {
  getServiceAccountToken,
  parseServiceAccountCredentials,
} from "@openplane/integrations";
import type {
  GmailAttachmentInfo,
  GmailMediaInfo,
  GmailSyncBatch,
  GmailTransformContext,
} from "@openplane/types/services/connectors/gmail";
import type { GenericDocument } from "@openplane/vespa";
import { logger } from "../../lib/logger";
import { createGmailClient, type GmailClient } from "../client";
import {
  gmailIncrementalSync,
  type IncrementalSyncOptions,
} from "./incremental";

export interface DomainSyncCursor {
  users: Record<string, DomainUserCursor>;
  lastUserListSync?: number;
  lastFullSync?: number;
}

export interface DomainUserCursor {
  historyId?: string;
  lastSyncedAt?: number;
  error?: string;
}

export interface DomainSyncOptions {
  cursor?: DomainSyncCursor;
  concurrency?: number;
  batchSize?: number;
  includeLabels?: string[];
  excludeLabels?: string[];
  indexAttachments?: boolean;
  indexMedia?: boolean;
  userEmails?: string[];
  onAttachmentsDiscovered?: (
    attachments: GmailAttachmentInfo[]
  ) => Promise<void>;
  onMediaDiscovered?: (media: GmailMediaInfo[]) => Promise<void>;
}

export interface DomainSyncResult {
  cursor: DomainSyncCursor;
  stats: {
    usersProcessed: number;
    documentsProcessed: number;
    errors: number;
  };
}

export async function* syncDomainMailboxes(
  connectorId: string,
  context: Omit<GmailTransformContext, "userEmail">,
  options: DomainSyncOptions = {}
): AsyncGenerator<
  GmailSyncBatch<GenericDocument>,
  DomainSyncResult,
  undefined
> {
  const {
    cursor = { users: {} },
    concurrency = 3,
    batchSize = 100,
    includeLabels,
    excludeLabels,
    indexAttachments = true,
    indexMedia = true,
    userEmails,
    onAttachmentsDiscovered,
    onMediaDiscovered,
  } = options;

  const connector = await getConnectorForSync(prisma, connectorId);

  if (!connector?.encryptedCredentials) {
    throw new Error("Service account credentials not found");
  }

  const credentialsJson = decryptIfEncrypted(
    connector.encryptedCredentials,
    connector.credentialsIv
  );

  if (!credentialsJson) {
    throw new Error("Failed to decrypt service account credentials");
  }

  const credentials = parseServiceAccountCredentials(credentialsJson);

  const config = connector.config as { delegatedEmail?: string } | null;
  const delegatedEmail = config?.delegatedEmail;

  const emails =
    userEmails ?? (await listDomainUsers(credentials, delegatedEmail));

  const newCursor: DomainSyncCursor = {
    users: { ...cursor.users },
    lastUserListSync: Date.now(),
  };

  let usersProcessed = 0;
  let documentsProcessed = 0;
  let errors = 0;

  const chunks = chunkArray(emails, concurrency);

  for (const chunk of chunks) {
    const results = await Promise.allSettled(
      chunk.map(async (email) => {
        const userCursor = cursor.users[email];

        const client = await createClientForUser(
          credentials,
          email,
          connectorId
        );

        const userContext: GmailTransformContext = {
          ...context,
          userEmail: email,
        };

        const syncOptions: IncrementalSyncOptions = {
          cursor: userCursor ? { historyId: userCursor.historyId } : undefined,
          batchSize,
          includeLabels,
          excludeLabels,
          indexAttachments,
          indexMedia,
          onAttachmentsDiscovered,
          onMediaDiscovered,
        };

        const batches: GmailSyncBatch<GenericDocument>[] = [];

        for await (const batch of gmailIncrementalSync(
          client,
          userContext,
          syncOptions
        )) {
          batches.push(batch);
        }

        return { email, batches };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        const { email, batches } = result.value;

        for (const batch of batches) {
          documentsProcessed += batch.items.length;
          yield batch;
        }

        const lastBatch = batches.at(-1);
        if (lastBatch) {
          newCursor.users[email] = {
            historyId: lastBatch.cursor.historyId,
            lastSyncedAt: Date.now(),
          };
        }

        usersProcessed += 1;
      } else {
        errors += 1;
        logger.error(
          { connectorId, error: result.reason },
          "Domain user sync failed"
        );
      }
    }
  }

  newCursor.lastFullSync = Date.now();

  return {
    cursor: newCursor,
    stats: {
      usersProcessed,
      documentsProcessed,
      errors,
    },
  };
}

async function listDomainUsers(
  credentials: ReturnType<typeof parseServiceAccountCredentials>,
  delegatedEmail: string | undefined
): Promise<string[]> {
  if (!delegatedEmail) {
    throw new Error("Delegated admin email not configured");
  }

  const tokenResult = await getServiceAccountToken({
    credentials,
    delegatedUserEmail: delegatedEmail,
    scopes: ["https://www.googleapis.com/auth/admin.directory.user.readonly"],
  });

  const response = await fetch(
    "https://admin.googleapis.com/admin/directory/v1/users?customer=my_customer&maxResults=500",
    {
      headers: {
        Authorization: `Bearer ${tokenResult.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list domain users: ${error}`);
  }

  const data = (await response.json()) as {
    users?: Array<{ primaryEmail?: string }>;
  };
  const users = data.users ?? [];

  return users
    .map((u) => u.primaryEmail)
    .filter((email): email is string => Boolean(email));
}

async function createClientForUser(
  credentials: ReturnType<typeof parseServiceAccountCredentials>,
  userEmail: string,
  connectorId: string
): Promise<GmailClient> {
  const tokenResult = await getServiceAccountToken({
    credentials,
    delegatedUserEmail: userEmail,
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
  });

  return createGmailClient({
    accessToken: tokenResult.accessToken,
    connectorId,
    userEmail,
  });
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function mergeDomainCursors(
  existing: DomainSyncCursor,
  update: Partial<DomainSyncCursor>
): DomainSyncCursor {
  return {
    users: {
      ...existing.users,
      ...update.users,
    },
    lastUserListSync: update.lastUserListSync ?? existing.lastUserListSync,
    lastFullSync: update.lastFullSync ?? existing.lastFullSync,
  };
}

export function getUsersNeedingSync(
  cursor: DomainSyncCursor,
  maxAgeMs = 24 * 60 * 60 * 1000
): string[] {
  const now = Date.now();
  const staleUsers: string[] = [];

  for (const [email, userCursor] of Object.entries(cursor.users)) {
    if (!userCursor.lastSyncedAt || now - userCursor.lastSyncedAt > maxAgeMs) {
      staleUsers.push(email);
    }
  }

  return staleUsers;
}
