import { describe, expect, it } from "bun:test";
import type { Database } from "@openbeam/db";
import {
  askRAGForActor,
  createRAGConversationForActor,
  deleteRAGConversationForActor,
  getRAGConversationForActor,
  listRAGConversationsForActor,
  RAGServiceError,
} from "../rag-api";

function createDatabaseStub(options?: {
  total?: number;
  existingConversation?: boolean;
  deleteCount?: number;
}) {
  const total = options?.total ?? 3;
  const existingConversation = options?.existingConversation ?? true;
  const deleteCount = options?.deleteCount ?? 1;
  let createdConversationInput: {
    userId: string;
    teamId: string;
    title?: string;
  } | null = null;

  const db = {
    conversation: {
      create: (input: {
        data: {
          userId: string;
          teamId: string;
          title?: string;
        };
      }) => {
        createdConversationInput = input.data;
        return {
          id: "conversation_new",
          ...input.data,
        };
      },
      findMany: async () => [
        {
          id: "conversation_1",
          title: "Conversation 1",
          messageCount: 2,
          createdAt: new Date("2026-02-15T00:00:00.000Z"),
          updatedAt: new Date("2026-02-15T00:00:00.000Z"),
        },
        {
          id: "conversation_2",
          title: "Conversation 2",
          messageCount: 1,
          createdAt: new Date("2026-02-15T00:00:00.000Z"),
          updatedAt: new Date("2026-02-15T00:00:00.000Z"),
        },
      ],
      count: async () => total,
      findFirst: async () =>
        existingConversation
          ? {
              id: "conversation_1",
              title: "Conversation 1",
              summary: null,
              messageCount: 2,
              createdAt: new Date("2026-02-15T00:00:00.000Z"),
              updatedAt: new Date("2026-02-15T00:00:00.000Z"),
              messages: [
                {
                  id: "message_1",
                  role: "user",
                  content: "hello",
                  citations: [],
                  groundingScore: 0.7,
                  confidence: "high",
                  createdAt: new Date("2026-02-15T00:00:00.000Z"),
                },
              ],
            }
          : null,
      deleteMany: async () => ({ count: deleteCount }),
    },
  } as unknown as Database;

  return {
    db,
    getCreatedConversationInput: () => createdConversationInput,
  };
}

describe("rag api service", () => {
  it("creates conversation for api key actor with derived user id", async () => {
    const state = createDatabaseStub();

    const result = await createRAGConversationForActor(state.db, {
      teamId: "team_1",
      authContext: { type: "apiKey", apiKeyId: "key_1" },
    });

    expect(result.success).toBe(true);
    expect(state.getCreatedConversationInput()?.userId).toBe("api_key:key_1");
    expect(state.getCreatedConversationInput()?.teamId).toBe("team_1");
  });

  it("lists conversations with hasMore and nextOffset", async () => {
    const state = createDatabaseStub({ total: 5 });

    const result = await listRAGConversationsForActor(state.db, {
      teamId: "team_1",
      authContext: { type: "session", userId: "user_1" },
      status: "active",
      limit: 2,
      offset: 0,
    });

    expect(result.conversations.length).toBe(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextOffset).toBe(2);
  });

  it("returns not found for missing conversation lookup", async () => {
    const state = createDatabaseStub({ existingConversation: false });

    await expect(
      getRAGConversationForActor(state.db, {
        teamId: "team_1",
        authContext: { type: "session", userId: "user_1" },
        conversationId: "missing",
      })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns not found when delete does not remove a conversation", async () => {
    const state = createDatabaseStub({ deleteCount: 0 });

    await expect(
      deleteRAGConversationForActor(state.db, {
        teamId: "team_1",
        authContext: { type: "session", userId: "user_1" },
        conversationId: "missing",
      })
    ).rejects.toBeInstanceOf(RAGServiceError);
  });

  it("rejects ask when actor is unavailable", async () => {
    const state = createDatabaseStub();

    await expect(
      askRAGForActor(state.db, {
        teamId: null,
        authContext: { type: "session", userId: "user_1" },
        query: "What changed?",
        includeMedia: true,
      })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
