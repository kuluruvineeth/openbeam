import {
  countConversations,
  createConversation,
  type Database,
  deleteConversation,
  findConversationWithMessages,
  listConversations,
} from "@openplane/db";
import {
  type ConversationContext,
  getConversationManager,
  getRAGOrchestrator,
  type RAGRequest,
  type RAGStreamChunk,
} from "./ai";
import type { ApiAccessAuthContext } from "./api-access";

export type RAGServiceErrorCode = "UNAUTHORIZED" | "NOT_FOUND";

export class RAGServiceError extends Error {
  readonly code: RAGServiceErrorCode;

  constructor(code: RAGServiceErrorCode, message: string) {
    super(message);
    this.name = "RAGServiceError";
    this.code = code;
  }
}

type RAGActor = {
  userId: string;
  email: string | null;
  teamId: string;
  accessControlIds: string[];
};

function resolveActor(input: {
  authContext: ApiAccessAuthContext;
  teamId: string | null;
}): RAGActor | null {
  if (!input.teamId) {
    return null;
  }

  const teamId = input.teamId;

  if (input.authContext.type === "session") {
    const ids = new Set<string>();
    ids.add(input.authContext.userId);
    ids.add(`user:${input.authContext.userId}`);
    ids.add(`team:${teamId}`);

    if (input.authContext.email) {
      ids.add(input.authContext.email);
      ids.add(`email:${input.authContext.email}`);
    }

    return {
      userId: input.authContext.userId,
      email: input.authContext.email ?? null,
      teamId,
      accessControlIds: Array.from(ids),
    };
  }

  if (input.authContext.type === "apiKey") {
    const userId = `api_key:${input.authContext.apiKeyId ?? "unknown"}`;
    const ids = new Set<string>();
    ids.add(`team:${teamId}`);
    ids.add(userId);
    ids.add(`user:${userId}`);

    return {
      userId,
      email: null,
      teamId,
      accessControlIds: Array.from(ids),
    };
  }

  return null;
}

async function buildConversationContext(
  db: Database,
  actor: RAGActor,
  conversationId?: string
): Promise<ConversationContext | null> {
  if (!conversationId) {
    return null;
  }

  const manager = getConversationManager(db);
  return await manager.getConversationContext(
    conversationId,
    actor.userId,
    actor.teamId
  );
}

function buildRequest(
  actor: RAGActor,
  input: {
    query: string;
    conversationId?: string;
    modelId?: string;
    temperature?: number;
    includeMedia: boolean;
    sourceId?: string;
  },
  conversationContext: ConversationContext | null
): RAGRequest {
  return {
    query: input.query,
    teamId: actor.teamId,
    userId: actor.userId,
    conversationId: input.conversationId,
    conversationContext: conversationContext ?? undefined,
    accessControlIds: actor.accessControlIds,
    modelId: input.modelId,
    temperature: input.temperature,
    includeMedia: input.includeMedia,
    sourceId: input.sourceId,
  };
}

function requireActor(input: {
  authContext: ApiAccessAuthContext;
  teamId: string | null;
}): RAGActor {
  const actor = resolveActor(input);
  if (!actor) {
    throw new RAGServiceError("UNAUTHORIZED", "Unauthorized");
  }
  return actor;
}

export async function askRAGForActor(
  db: Database,
  input: {
    teamId: string | null;
    authContext: ApiAccessAuthContext;
    query: string;
    conversationId?: string;
    modelId?: string;
    temperature?: number;
    includeMedia: boolean;
    sourceId?: string;
  }
) {
  const actor = await requireActor({
    authContext: input.authContext,
    teamId: input.teamId,
  });

  const conversationContext = await buildConversationContext(
    db,
    actor,
    input.conversationId
  );

  const orchestrator = getRAGOrchestrator(db);
  const response = await orchestrator.answer(
    buildRequest(actor, input, conversationContext)
  );

  return {
    answer: response.answer,
    citations: response.citations,
    grounding: response.grounding,
    conversationId: response.conversationId,
    usage: response.usage,
    timing: response.timing,
  };
}

export async function streamRAGForActor(
  db: Database,
  input: {
    teamId: string | null;
    authContext: ApiAccessAuthContext;
    query: string;
    conversationId?: string;
    modelId?: string;
    temperature?: number;
    includeMedia: boolean;
    sourceId?: string;
  }
): Promise<AsyncGenerator<RAGStreamChunk>> {
  const actor = await requireActor({
    authContext: input.authContext,
    teamId: input.teamId,
  });

  const conversationContext = await buildConversationContext(
    db,
    actor,
    input.conversationId
  );

  const orchestrator = getRAGOrchestrator(db);
  const request = buildRequest(actor, input, conversationContext);

  return orchestrator.stream(request);
}

export async function createRAGConversationForActor(
  db: Database,
  input: {
    teamId: string | null;
    authContext: ApiAccessAuthContext;
  }
) {
  const actor = await requireActor({
    authContext: input.authContext,
    teamId: input.teamId,
  });

  const conversation = await createConversation(db, {
    userId: actor.userId,
    teamId: actor.teamId,
  });

  return {
    id: conversation.id,
    success: true as const,
  };
}

export async function listRAGConversationsForActor(
  db: Database,
  input: {
    teamId: string | null;
    authContext: ApiAccessAuthContext;
    status: "active" | "archived";
    limit: number;
    offset: number;
  }
) {
  const actor = await requireActor({
    authContext: input.authContext,
    teamId: input.teamId,
  });

  const [conversations, total] = await Promise.all([
    listConversations(db, actor.userId, actor.teamId, {
      status: input.status,
      limit: input.limit,
      offset: input.offset,
    }),
    countConversations(db, actor.userId, actor.teamId, input.status),
  ]);

  const hasMore = input.offset + conversations.length < total;

  return {
    conversations,
    total,
    hasMore,
    nextOffset: hasMore ? input.offset + input.limit : undefined,
  };
}

export async function getRAGConversationForActor(
  db: Database,
  input: {
    teamId: string | null;
    authContext: ApiAccessAuthContext;
    conversationId: string;
  }
) {
  const actor = await requireActor({
    authContext: input.authContext,
    teamId: input.teamId,
  });

  const conversation = await findConversationWithMessages(
    db,
    input.conversationId,
    actor.userId,
    actor.teamId
  );

  if (!conversation) {
    throw new RAGServiceError("NOT_FOUND", "Conversation not found");
  }

  return {
    id: conversation.id,
    title: conversation.title,
    summary: conversation.summary,
    messageCount: conversation.messageCount,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      citations: message.citations,
      groundingScore: message.groundingScore,
      confidence: message.confidence,
      createdAt: message.createdAt,
    })),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

export async function deleteRAGConversationForActor(
  db: Database,
  input: {
    teamId: string | null;
    authContext: ApiAccessAuthContext;
    conversationId: string;
  }
) {
  const actor = await requireActor({
    authContext: input.authContext,
    teamId: input.teamId,
  });

  const result = await deleteConversation(
    db,
    input.conversationId,
    actor.userId,
    actor.teamId
  );

  if (result.count === 0) {
    throw new RAGServiceError("NOT_FOUND", "Conversation not found");
  }
}
