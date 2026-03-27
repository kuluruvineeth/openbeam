import type { Database } from "@openbeam/db";
import {
  addContextSessionMessage,
  createContextSession,
  findContextSession,
  listContextSessions,
  updateContextSessionStatus,
  updateContextSessionTokens,
} from "@openbeam/db";
import type {
  ContextSession,
  ContextSessionMessage,
} from "@openbeam/types/context";

const AUTO_COMMIT_THRESHOLD = 8000;
const TOKENS_PER_CHAR = 0.25;

export type MemoryExtractionTrigger = (params: {
  sessionId: string;
  teamId: string;
  userId: string;
  agentId?: string | null;
}) => Promise<{ workflowId: string }>;

function estimateTokens(content: string): number {
  return Math.ceil(content.length * TOKENS_PER_CHAR);
}

export class ContextSessionManager {
  private readonly db: Database;
  private readonly triggerMemoryExtraction?: MemoryExtractionTrigger;

  constructor(db: Database, triggerMemoryExtraction?: MemoryExtractionTrigger) {
    this.db = db;
    this.triggerMemoryExtraction = triggerMemoryExtraction;
  }

  async create(
    teamId: string,
    userId: string,
    agentId?: string
  ): Promise<ContextSession> {
    const session = await createContextSession(this.db, {
      teamId,
      userId,
      agentId,
    });
    return session as ContextSession;
  }

  async addMessage(
    sessionId: string,
    role: string,
    content: string,
    parts?: unknown
  ): Promise<void> {
    const tokenCount = estimateTokens(content);

    await addContextSessionMessage(this.db, {
      sessionId,
      role,
      content,
      parts,
      tokenCount,
    });

    const session = await findContextSession(this.db, sessionId);
    if (!session) {
      return;
    }

    const newTotal = session.totalTokens + tokenCount;
    await updateContextSessionTokens(this.db, sessionId, newTotal);

    if (newTotal > AUTO_COMMIT_THRESHOLD && session.status === "active") {
      await this.commit(sessionId);
    }
  }

  async getMessages(
    sessionId: string,
    limit?: number
  ): Promise<ContextSessionMessage[]> {
    const session = await findContextSession(this.db, sessionId);
    if (!session) {
      return [];
    }

    const messages = session.messages as ContextSessionMessage[];
    if (limit !== undefined) {
      return messages.slice(0, limit);
    }
    return messages;
  }

  async commit(sessionId: string): Promise<{ workflowId: string }> {
    const session = await findContextSession(this.db, sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== "active") {
      throw new Error(
        `Session ${sessionId} is not active (status: ${session.status})`
      );
    }

    const workflowId = `memory-extraction:${sessionId}`;

    if (this.triggerMemoryExtraction) {
      const result = await this.triggerMemoryExtraction({
        sessionId,
        teamId: session.teamId,
        userId: session.userId,
        agentId: session.agentId,
      });
      await updateContextSessionStatus(this.db, sessionId, "committed");
      return { workflowId: result.workflowId };
    }

    await updateContextSessionStatus(this.db, sessionId, "committed");
    return { workflowId };
  }

  async delete(sessionId: string): Promise<void> {
    await this.db.contextSession.delete({
      where: { id: sessionId },
    });
  }

  async list(
    teamId: string,
    userId: string,
    limit = 20
  ): Promise<ContextSession[]> {
    const sessions = await listContextSessions(this.db, teamId, userId, limit);
    return sessions as ContextSession[];
  }
}
