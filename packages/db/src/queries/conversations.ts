import type { Database } from "../index";

export function findConversationById(db: Database, id: string, userId: string) {
  return db.conversation.findFirst({
    where: { id, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export function findConversationWithMessages(
  db: Database,
  id: string,
  userId: string,
  teamId: string
) {
  return db.conversation.findFirst({
    where: { id, userId, teamId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export function listConversations(
  db: Database,
  userId: string,
  teamId: string,
  options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status = "active", limit = 20, offset = 0 } = options;

  return db.conversation.findMany({
    where: {
      userId,
      teamId,
      status,
    },
    select: {
      id: true,
      title: true,
      messageCount: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export function getRecentMessages(
  db: Database,
  conversationId: string,
  limit = 20
) {
  return db.conversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function countConversations(
  db: Database,
  userId: string,
  teamId: string,
  status = "active"
) {
  return db.conversation.count({
    where: { userId, teamId, status },
  });
}
