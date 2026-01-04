import type { Database } from "../index";

export function createConversation(
  db: Database,
  data: {
    userId: string;
    teamId: string;
    title?: string;
  }
) {
  return db.conversation.create({
    data: {
      userId: data.userId,
      teamId: data.teamId,
      title: data.title,
    },
  });
}

export function addConversationMessage(
  db: Database,
  conversationId: string,
  data: {
    role: "user" | "assistant";
    content: string;
    citations?: unknown[];
    contextDocIds?: string[];
    groundingScore?: number;
    confidence?: string;
    promptTokens?: number;
    completionTokens?: number;
    latencyMs?: number;
    firstTokenMs?: number;
  }
) {
  return db.$transaction(async (tx) => {
    const message = await tx.conversationMessage.create({
      data: {
        conversationId,
        role: data.role,
        content: data.content,
        citations: data.citations ? JSON.stringify(data.citations) : "[]",
        contextDocIds: data.contextDocIds ?? [],
        groundingScore: data.groundingScore,
        confidence: data.confidence,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        latencyMs: data.latencyMs,
        firstTokenMs: data.firstTokenMs,
      },
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        messageCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    return message;
  });
}

export function updateConversationSummary(
  db: Database,
  conversationId: string,
  summary: string,
  summaryUpToMessageId?: string
) {
  return db.conversation.update({
    where: { id: conversationId },
    data: {
      summary,
      summaryUpToMessageId,
    },
  });
}

export function archiveConversation(db: Database, conversationId: string) {
  return db.conversation.update({
    where: { id: conversationId },
    data: { status: "archived" },
  });
}

export function deleteConversation(
  db: Database,
  conversationId: string,
  userId: string,
  teamId: string
) {
  return db.conversation.deleteMany({
    where: {
      id: conversationId,
      userId,
      teamId,
    },
  });
}

export function updateConversationTitle(
  db: Database,
  conversationId: string,
  title: string
) {
  return db.conversation.update({
    where: { id: conversationId },
    data: { title },
  });
}
