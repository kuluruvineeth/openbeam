import type { Database } from "../index";

export function upsertContextEntry(
  db: Database,
  data: {
    id: string;
    uri: string;
    parentUri?: string;
    teamId: string;
    ownerId: string;
    ownerType: string;
    contextType: string;
    category?: string;
    isLeaf?: boolean;
    abstractText: string;
    overview?: string;
    content?: string;
  }
) {
  return db.contextEntry.upsert({
    where: { teamId_uri: { teamId: data.teamId, uri: data.uri } },
    create: {
      id: data.id,
      uri: data.uri,
      parentUri: data.parentUri,
      teamId: data.teamId,
      ownerId: data.ownerId,
      ownerType: data.ownerType,
      contextType: data.contextType,
      category: data.category,
      isLeaf: data.isLeaf ?? true,
      abstractText: data.abstractText,
      overview: data.overview,
      content: data.content,
    },
    update: {
      abstractText: data.abstractText,
      overview: data.overview,
      content: data.content,
      category: data.category,
      isLeaf: data.isLeaf,
      parentUri: data.parentUri,
    },
  });
}

export function deleteContextEntry(db: Database, teamId: string, uri: string) {
  return db.contextEntry.deleteMany({
    where: { teamId, uri },
  });
}

export function incrementActiveCount(
  db: Database,
  teamId: string,
  uri: string
) {
  return db.contextEntry.updateMany({
    where: { teamId, uri },
    data: { activeCount: { increment: 1 } },
  });
}

export function createContextRelation(
  db: Database,
  data: {
    sourceUri: string;
    targetUri: string;
    teamId: string;
    reason?: string;
    relationType?: string;
  }
) {
  return db.contextRelation.create({
    data: {
      sourceUri: data.sourceUri,
      targetUri: data.targetUri,
      teamId: data.teamId,
      reason: data.reason,
      relationType: data.relationType,
    },
  });
}

export function deleteContextRelation(
  db: Database,
  teamId: string,
  sourceUri: string,
  targetUri: string
) {
  return db.contextRelation.deleteMany({
    where: { teamId, sourceUri, targetUri },
  });
}

export function createContextSession(
  db: Database,
  data: {
    teamId: string;
    userId: string;
    agentId?: string;
  }
) {
  return db.contextSession.create({
    data: {
      teamId: data.teamId,
      userId: data.userId,
      agentId: data.agentId,
    },
  });
}

export function addContextSessionMessage(
  db: Database,
  data: {
    sessionId: string;
    role: string;
    content: string;
    parts?: unknown;
    tokenCount?: number;
  }
) {
  return db.contextSessionMessage.create({
    data: {
      sessionId: data.sessionId,
      role: data.role,
      content: data.content,
      parts: data.parts as object | undefined,
      tokenCount: data.tokenCount ?? 0,
    },
  });
}

export function updateContextSessionStatus(
  db: Database,
  sessionId: string,
  status: string
) {
  return db.contextSession.update({
    where: { id: sessionId },
    data: { status },
  });
}

export function updateContextSessionTokens(
  db: Database,
  sessionId: string,
  tokens: number
) {
  return db.contextSession.update({
    where: { id: sessionId },
    data: { totalTokens: tokens },
  });
}
