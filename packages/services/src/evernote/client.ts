import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { EvernoteClientConfig } from "@openbeam/types/services/connectors/evernote";
import Evernote from "evernote";
import { logger } from "../lib/logger";
import { EvernoteApiError } from "./types";

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 30,
  requestsPerHour: 200,
  burstLimit: 10,
};

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30_000;

export interface EvernoteNote {
  guid?: string;
  title?: string;
  content?: string;
  notebookGuid?: string;
  tagNames?: string[];
  tagGuids?: string[];
  created?: number;
  updated?: number;
  active?: boolean;
  updateSequenceNum?: number;
  contentLength?: number;
  attributes?: {
    sourceURL?: string;
    source?: string;
    author?: string;
  };
}

export interface EvernoteNotebook {
  guid?: string;
  name?: string;
  updateSequenceNum?: number;
  defaultNotebook?: boolean;
  serviceCreated?: number;
  serviceUpdated?: number;
  stack?: string;
  sharedNotebookIds?: string[];
}

export interface EvernoteTag {
  guid?: string;
  name?: string;
  updateSequenceNum?: number;
}

export interface EvernoteNoteMetadata {
  guid?: string;
  title?: string;
  created?: number;
  updated?: number;
  updateSequenceNum?: number;
  notebookGuid?: string;
  tagGuids?: string[];
  contentLength?: number;
  attributes?: {
    sourceURL?: string;
    source?: string;
    author?: string;
  };
}

export type EvernoteClient = {
  readonly connectorId: string;
  createNote(note: EvernoteNote): Promise<EvernoteNote>;
  updateNote(note: EvernoteNote): Promise<EvernoteNote>;
  deleteNote(guid: string): Promise<void>;
  getNote(guid: string): Promise<EvernoteNote>;
  findNotesMetadata(
    filter: {
      words?: string;
      notebookGuid?: string;
      updateSequenceNumMin?: number;
    },
    offset: number,
    maxNotes: number
  ): Promise<{
    notes: EvernoteNoteMetadata[];
    totalNotes: number;
    updateCount: number;
  }>;
  listNotebooks(): Promise<EvernoteNotebook[]>;
  listTags(): Promise<EvernoteTag[]>;
  healthCheck(): Promise<boolean>;
};

export function createEvernoteClient(
  config: EvernoteClientConfig
): EvernoteClient {
  const { connectorId, developerToken, environment = "production" } = config;

  const sdkClient = new Evernote.Client({
    token: developerToken,
    sandbox: environment === "sandbox",
  });

  const noteStore = sdkClient.getNoteStore();

  return {
    connectorId,
    createNote: (note) => noteStore.createNote(note) as Promise<EvernoteNote>,
    updateNote: (note) => noteStore.updateNote(note) as Promise<EvernoteNote>,
    deleteNote: (guid) =>
      noteStore.deleteNote(guid).then(Function.prototype as () => void),
    getNote: (guid) =>
      noteStore.getNote(
        guid,
        true,
        false,
        false,
        false
      ) as Promise<EvernoteNote>,
    async findNotesMetadata(noteFilter, startOffset, limit) {
      const result = await (
        noteStore as unknown as {
          findNotesMetadata(
            filter: unknown,
            offset: number,
            maxNotes: number,
            spec: unknown
          ): Promise<{
            notes: EvernoteNoteMetadata[];
            totalNotes: number;
            updateCount: number;
          }>;
        }
      ).findNotesMetadata(noteFilter, startOffset, limit, {
        includeTitle: true,
        includeCreated: true,
        includeUpdated: true,
        includeUpdateSequenceNum: true,
        includeNotebookGuid: true,
        includeTagGuids: true,
        includeContentLength: true,
        includeAttributes: true,
      });
      return result;
    },
    listNotebooks: () =>
      noteStore.listNotebooks() as Promise<EvernoteNotebook[]>,
    listTags: () => noteStore.listTags() as Promise<EvernoteTag[]>,
    async healthCheck() {
      try {
        await noteStore.listNotebooks();
        return true;
      } catch {
        return false;
      }
    },
  };
}

export async function withRateLimit<T>(
  client: EvernoteClient,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const { allowed } = await rateLimiter.checkConnectorRateLimit(
    client.connectorId,
    "evernote",
    RATE_LIMITS
  );

  if (!allowed) {
    const quotaAvailable = await rateLimiter.waitForQuota(
      client.connectorId,
      "evernote",
      RATE_LIMITS,
      5
    );

    if (!quotaAvailable) {
      throw new EvernoteApiError({
        message: "Rate limit exceeded",
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter: 60,
      });
    }
  }

  return retryOnError(client.connectorId, operation, fn);
}

async function retryOnError<T>(
  connectorId: string,
  operation: string,
  fn: () => Promise<T>,
  attempt = 0
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    const isRateLimited = isEvernoteRateLimitError(error);
    if (isRateLimited && attempt < MAX_RETRY_ATTEMPTS) {
      const retryAfter = extractRetryAfter(error) ?? 60;
      logger.warn(
        { connectorId, operation, retryAfter, attempt },
        "Evernote API rate limited, retrying"
      );
      await sleep(retryAfter * 1000);
      return retryOnError(connectorId, operation, fn, attempt + 1);
    }

    const isServerError = isEvernoteSystemError(error);
    if (isServerError && attempt < MAX_RETRY_ATTEMPTS) {
      const delayMs = Math.min(
        BASE_RETRY_DELAY_MS * 2 ** attempt +
          Math.random() * BASE_RETRY_DELAY_MS,
        MAX_RETRY_DELAY_MS
      );
      logger.warn(
        { connectorId, operation, attempt },
        "Evernote API system error, retrying"
      );
      await sleep(delayMs);
      return retryOnError(connectorId, operation, fn, attempt + 1);
    }

    throw toEvernoteApiError(error);
  }
}

function isEvernoteRateLimitError(error: unknown): boolean {
  if (error && typeof error === "object" && "rateLimitDuration" in error) {
    return true;
  }
  if (error && typeof error === "object" && "errorCode" in error) {
    return (error as { errorCode: number }).errorCode === 19;
  }
  return false;
}

function isEvernoteSystemError(error: unknown): boolean {
  return !!(
    error &&
    typeof error === "object" &&
    "errorCode" in error &&
    (error as { errorCode: number }).errorCode !== 1 &&
    (error as { errorCode: number }).errorCode !== 2 &&
    (error as { errorCode: number }).errorCode !== 3
  );
}

function extractRetryAfter(error: unknown): number | undefined {
  if (error && typeof error === "object" && "rateLimitDuration" in error) {
    return (error as { rateLimitDuration: number }).rateLimitDuration;
  }
  return;
}

function toEvernoteApiError(error: unknown): EvernoteApiError {
  if (error instanceof EvernoteApiError) {
    return error;
  }

  if (error && typeof error === "object" && "errorCode" in error) {
    const edamError = error as {
      errorCode: number;
      parameter?: string;
      message?: string;
      rateLimitDuration?: number;
    };
    const codeMap: Record<number, string> = {
      1: "UNKNOWN",
      2: "BAD_DATA_FORMAT",
      3: "PERMISSION_DENIED",
      4: "INTERNAL_ERROR",
      5: "DATA_REQUIRED",
      6: "LIMIT_REACHED",
      7: "QUOTA_REACHED",
      8: "INVALID_AUTH",
      9: "AUTH_EXPIRED",
      10: "DATA_CONFLICT",
      11: "ENML_VALIDATION",
      12: "SHARD_UNAVAILABLE",
      19: "RATE_LIMITED",
    };

    const code = codeMap[edamError.errorCode] ?? "UNKNOWN";
    const retryable =
      edamError.errorCode === 4 ||
      edamError.errorCode === 12 ||
      edamError.errorCode === 19;
    return new EvernoteApiError({
      message:
        edamError.message ??
        edamError.parameter ??
        `Evernote error code ${edamError.errorCode}`,
      code,
      retryable,
      retryAfter: edamError.rateLimitDuration,
    });
  }

  return new EvernoteApiError({
    message:
      error instanceof Error ? error.message : "Unknown Evernote API error",
    code: "UNKNOWN",
    retryable: false,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
