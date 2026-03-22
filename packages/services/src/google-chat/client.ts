import { logger } from "../lib/logger";
import { GoogleChatApiError } from "./types";

const CHAT_API_BASE = "https://chat.googleapis.com/v1";
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type GoogleChatClientConfig = {
  connectorId: string;
  accessToken: string;
};

type GoogleErrorBody = {
  error?: {
    message?: string;
    code?: number;
    errors?: Array<{ reason?: string }>;
  };
};

export type ChatSpace = {
  name: string;
  displayName: string;
  type: "ROOM" | "DM" | "SPACE";
  spaceType: string;
  singleUserBotDm?: boolean;
  threaded?: boolean;
  spaceDetails?: { description?: string; guidelines?: string };
  createTime?: string;
  externalUserAllowed?: boolean;
  spaceThreadingState?: string;
  membershipCount?: number;
};

export type ChatMessage = {
  name: string;
  text?: string;
  formattedText?: string;
  sender: {
    name: string;
    displayName?: string;
    type: string;
    domainId?: string;
  };
  createTime: string;
  lastUpdateTime?: string;
  thread?: { name: string; threadKey?: string };
  space?: { name: string };
  argumentText?: string;
  attachment?: Array<{
    name: string;
    contentName?: string;
    contentType?: string;
    thumbnailUri?: string;
    downloadUri?: string;
    driveDataRef?: { driveFileId: string };
  }>;
  annotations?: Array<{
    type: string;
    startIndex?: number;
    length?: number;
    userMention?: { user?: { name: string; displayName?: string } };
    slashCommand?: { commandName?: string };
  }>;
  emojiReactionSummaries?: Array<{
    emoji: { unicode?: string };
    reactionCount?: number;
  }>;
  deletionMetadata?: { deletionType: string };
};

export type ChatMember = {
  name: string;
  state: string;
  role: string;
  member?: {
    name: string;
    displayName?: string;
    domainId?: string;
    type: string;
  };
  createTime?: string;
};

type ListSpacesResponse = {
  spaces: ChatSpace[];
  nextPageToken?: string;
};

type ListMessagesResponse = {
  messages: ChatMessage[];
  nextPageToken?: string;
};

type ListMembersResponse = {
  memberships: ChatMember[];
  nextPageToken?: string;
};

export type GoogleChatClient = {
  readonly connectorId: string;
  listSpaces(): AsyncGenerator<ChatSpace[], void, undefined>;
  listMessages(
    spaceName: string,
    params?: { filter?: string; pageSize?: number; orderBy?: string }
  ): AsyncGenerator<ChatMessage[], void, undefined>;
  listMembers(spaceName: string): AsyncGenerator<ChatMember[], void, undefined>;
  sendMessage(spaceName: string, text: string): Promise<ChatMessage>;
};

export function createGoogleChatClient(
  config: GoogleChatClientConfig
): GoogleChatClient {
  const { connectorId, accessToken } = config;

  function buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${CHAT_API_BASE}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  async function request<T>(url: string, attempt = 0): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "60",
        10
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        logger.warn(
          { connectorId, url, retryAfter, attempt },
          "Google Chat API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>(url, attempt + 1);
      }
      throw new GoogleChatApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMIT_EXCEEDED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = (await response.json().catch(() => ({}))) as GoogleErrorBody;
      throw new GoogleChatApiError({
        message: body.error?.message ?? "Authentication failed",
        statusCode: response.status,
        code: body.error?.errors?.[0]?.reason ?? "AUTH_ERROR",
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as GoogleErrorBody;
      const retryable = response.status >= 500;
      if (retryable && attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs =
          BASE_RETRY_DELAY_MS * 2 ** attempt +
          Math.random() * BASE_RETRY_DELAY_MS;
        logger.warn(
          { connectorId, url, statusCode: response.status, attempt },
          "Google Chat API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, attempt + 1);
      }
      throw new GoogleChatApiError({
        message: body.error?.message ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: body.error?.errors?.[0]?.reason ?? "SERVER_ERROR",
        retryable,
      });
    }

    return response.json() as Promise<T>;
  }

  async function* listSpaces(): AsyncGenerator<ChatSpace[], void, undefined> {
    let pageToken: string | undefined;

    do {
      const params: Record<string, string> = { pageSize: "100" };
      if (pageToken) {
        params.pageToken = pageToken;
      }

      const result = await request<ListSpacesResponse>(
        buildUrl("/spaces", params)
      );

      if (result.spaces?.length) {
        yield result.spaces;
      }

      pageToken = result.nextPageToken;
    } while (pageToken);
  }

  async function* listMessages(
    spaceName: string,
    options?: { filter?: string; pageSize?: number; orderBy?: string }
  ): AsyncGenerator<ChatMessage[], void, undefined> {
    let pageToken: string | undefined;

    do {
      const params: Record<string, string> = {
        pageSize: String(options?.pageSize ?? 100),
      };
      if (pageToken) {
        params.pageToken = pageToken;
      }
      if (options?.filter) {
        params.filter = options.filter;
      }
      if (options?.orderBy) {
        params.orderBy = options.orderBy;
      }

      const result = await request<ListMessagesResponse>(
        buildUrl(`/${spaceName}/messages`, params)
      );

      if (result.messages?.length) {
        yield result.messages;
      }

      pageToken = result.nextPageToken;
    } while (pageToken);
  }

  async function* listMembers(
    spaceName: string
  ): AsyncGenerator<ChatMember[], void, undefined> {
    let pageToken: string | undefined;

    do {
      const params: Record<string, string> = { pageSize: "100" };
      if (pageToken) {
        params.pageToken = pageToken;
      }

      const result = await request<ListMembersResponse>(
        buildUrl(`/${spaceName}/members`, params)
      );

      if (result.memberships?.length) {
        yield result.memberships;
      }

      pageToken = result.nextPageToken;
    } while (pageToken);
  }

  async function sendMessage(
    spaceName: string,
    text: string
  ): Promise<ChatMessage> {
    const url = buildUrl(`/${spaceName}/messages`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errBody = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      throw new GoogleChatApiError({
        message:
          errBody.error?.message ?? `Send message failed: ${response.status}`,
        statusCode: response.status,
        code: "MUTATION_ERROR",
        retryable: response.status >= 500,
      });
    }

    return response.json() as Promise<ChatMessage>;
  }

  return {
    connectorId,
    listSpaces,
    listMessages,
    listMembers,
    sendMessage,
  };
}
