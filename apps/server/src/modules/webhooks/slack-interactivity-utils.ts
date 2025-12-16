import prisma, { getDecryptedOAuthCredentials } from "@openplane/db";
import { createStateStore } from "@openplane/redis";
import {
  createSlackClient,
  handleSaveItem,
  verifySlackSignature,
} from "@openplane/services";
import type { Context } from "hono";
import logger from "../../utils/logger";
import type {
  HomeTabState,
  RagServiceDep,
  SavedItem,
  SavedMessageData,
  SaveStore,
  SearchServiceDep,
  SlackClient,
} from "./slack-interactivity-types";

export async function getSlackClient(
  connectorId: string,
  teamId?: string
): Promise<SlackClient> {
  const credentials = await getDecryptedOAuthCredentials(prisma, connectorId);
  if (!credentials?.accessToken) {
    throw new Error("No access token for connector");
  }
  return createSlackClient({
    token: credentials.accessToken,
    connectorId,
    teamId,
  });
}

export function verifyRequest(
  c: Context,
  rawBody: string,
  signingSecret?: string
): boolean {
  if (!signingSecret) {
    return true;
  }

  const signature = c.req.header("x-slack-signature");
  const timestamp = c.req.header("x-slack-request-timestamp");

  if (!(signature && timestamp)) {
    return true;
  }

  const verifyResult = verifySlackSignature(
    { body: rawBody, signature, timestamp },
    signingSecret
  );

  if (!verifyResult.valid) {
    logger.warn(
      { reason: verifyResult.reason },
      "Invalid interactivity signature"
    );
    return false;
  }

  return true;
}

export function parsePayload(rawBody: string, contentType: string): unknown {
  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(rawBody);
      const payloadStr = params.get("payload");
      return payloadStr ? JSON.parse(payloadStr) : Object.fromEntries(params);
    }
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

export function parsePrivateMetadata(
  metadata?: string
): Record<string, string> {
  if (!metadata) {
    return {};
  }
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}

export function extractSelectValue(
  values: Record<string, Record<string, unknown>>,
  blockId: string,
  actionId: string
): string | undefined {
  const block = values[blockId];
  if (!block) {
    return;
  }
  const action = block[actionId] as
    | { selected_option?: { value: string } }
    | undefined;
  return action?.selected_option?.value;
}

export function extractMultiSelectValue(
  values: Record<string, Record<string, unknown>>,
  blockId: string,
  actionId: string
): string[] {
  const block = values[blockId];
  if (!block) {
    return [];
  }
  const action = block[actionId] as
    | {
        selected_options?: Array<{ value: string }>;
        selected_conversations?: string[];
      }
    | undefined;
  if (action?.selected_conversations) {
    return action.selected_conversations;
  }
  return action?.selected_options?.map((o) => o.value) ?? [];
}

export function extractCheckboxValue(
  values: Record<string, Record<string, unknown>>,
  blockId: string,
  actionId: string
): boolean {
  const block = values[blockId];
  if (!block) {
    return false;
  }
  const action = block[actionId] as
    | { selected_options?: Array<{ value: string }> }
    | undefined;
  return (action?.selected_options?.length ?? 0) > 0;
}

export function extractTextValue(
  values: Record<string, Record<string, unknown>>,
  blockId: string,
  actionId: string
): string | undefined {
  const block = values[blockId];
  if (!block) {
    return;
  }
  const action = block[actionId] as { value?: string } | undefined;
  return action?.value;
}

export function buildSearchModal() {
  return {
    type: "modal" as const,
    callback_id: "global_search_submit",
    title: { type: "plain_text" as const, text: "Search" },
    submit: { type: "plain_text" as const, text: "Search" },
    close: { type: "plain_text" as const, text: "Cancel" },
    blocks: [
      {
        type: "input" as const,
        block_id: "query",
        element: {
          type: "plain_text_input" as const,
          action_id: "query_input",
          placeholder: {
            type: "plain_text" as const,
            text: "What are you looking for?",
          },
        },
        label: { type: "plain_text" as const, text: "Search Query" },
      },
    ],
  };
}

export function buildAskModal() {
  return {
    type: "modal" as const,
    callback_id: "global_ask_submit",
    title: { type: "plain_text" as const, text: "Ask OpenPlane" },
    submit: { type: "plain_text" as const, text: "Ask" },
    close: { type: "plain_text" as const, text: "Cancel" },
    blocks: [
      {
        type: "input" as const,
        block_id: "question",
        element: {
          type: "plain_text_input" as const,
          action_id: "question_input",
          multiline: true,
          placeholder: {
            type: "plain_text" as const,
            text: "Ask a question...",
          },
        },
        label: { type: "plain_text" as const, text: "Your Question" },
      },
    ],
  };
}

export function createSaveStore(teamId: string): SaveStore {
  const genericStore = createStateStore();
  const stateStore = {
    get: (key: string) => genericStore.get<HomeTabState>(key),
    set: (key: string, value: HomeTabState) => genericStore.set(key, value),
  };

  return {
    save: async (userId: string, data: SavedMessageData) => {
      const savedItem: SavedItem = {
        id: data.id,
        title:
          data.text.length > 100 ? `${data.text.slice(0, 97)}...` : data.text,
        url: data.url,
        savedAt: data.savedAt,
        documentType: "message",
        source: "Slack",
      };
      await handleSaveItem({ userId, teamId, item: savedItem }, { stateStore });
    },
    exists: async (userId: string, messageTs: string) => {
      const key = `home_state:${teamId}:${userId}`;
      const state = await stateStore.get(key);
      if (!state) {
        return false;
      }
      return state.savedItems.some((item) => item.id.endsWith(`_${messageTs}`));
    },
  };
}

export function createSearchService(): SearchServiceDep {
  return {
    search: async (_params: {
      query: string;
      teamId: string;
      accessControlIds: string[];
      limit: number;
    }) => ({ documents: [], total: 0 }),
  };
}

export function createRagService(): RagServiceDep {
  return {
    answer: async (_params: {
      query: string;
      teamId?: string;
      context?: string;
      accessControlIds?: string[];
      topK?: number;
      systemPrompt?: string;
    }) => ({ answer: "", citations: [] }),
  };
}

export function isFeedbackAction(actionId: string): boolean {
  return (
    actionId === "assistant_helpful" ||
    actionId === "assistant_not_helpful" ||
    actionId.startsWith("feedback_")
  );
}
