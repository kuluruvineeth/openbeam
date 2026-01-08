import type { AgentState } from "./config";

export interface AgentSession {
  id: string;
  teamId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  state: AgentState;
  checkpoints: SessionCheckpoint[];
  metadata: Record<string, unknown>;
}

export interface SessionCheckpoint {
  id: string;
  sessionId: string;
  createdAt: Date;
  state: AgentState;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationTurn {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ConversationHistory {
  sessionId: string;
  turns: ConversationTurn[];
  summary?: string;
  lastUpdated: Date;
}

export interface SessionManagerConfig {
  defaultExpirationMs?: number;
  maxCheckpoints?: number;
  onSessionCreate?: (session: AgentSession) => void;
  onSessionExpire?: (session: AgentSession) => void;
}

type SessionStore = Map<string, AgentSession>;
type CheckpointStore = Map<string, SessionCheckpoint[]>;
type HistoryStore = Map<string, ConversationHistory>;

export class SessionManager {
  private readonly sessions: SessionStore = new Map();
  private readonly checkpoints: CheckpointStore = new Map();
  private readonly histories: HistoryStore = new Map();
  private readonly config: SessionManagerConfig;

  constructor(config: SessionManagerConfig = {}) {
    this.config = {
      defaultExpirationMs: 24 * 60 * 60 * 1000,
      maxCheckpoints: 10,
      ...config,
    };
  }

  createSession(
    teamId: string,
    userId: string,
    metadata?: Record<string, unknown>
  ): AgentSession {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date();

    const session: AgentSession = {
      id,
      teamId,
      userId,
      createdAt: now,
      updatedAt: now,
      expiresAt: this.config.defaultExpirationMs
        ? new Date(now.getTime() + this.config.defaultExpirationMs)
        : undefined,
      state: {
        values: new Map(),
        history: [],
      },
      checkpoints: [],
      metadata: metadata ?? {},
    };

    this.sessions.set(id, session);
    this.checkpoints.set(id, []);
    this.histories.set(id, {
      sessionId: id,
      turns: [],
      lastUpdated: now,
    });

    this.config.onSessionCreate?.(session);

    return session;
  }

  getSession(sessionId: string): AgentSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    if (this.isExpired(session)) {
      this.expireSession(session);
      return null;
    }

    return session;
  }

  resumeSession(sessionId: string): AgentSession | null {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    session.updatedAt = new Date();
    if (this.config.defaultExpirationMs) {
      session.expiresAt = new Date(
        Date.now() + this.config.defaultExpirationMs
      );
    }

    return session;
  }

  updateSession(
    sessionId: string,
    updates: Partial<Pick<AgentSession, "state" | "metadata">>
  ): AgentSession | null {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    if (updates.state) {
      session.state = updates.state;
    }
    if (updates.metadata) {
      session.metadata = { ...session.metadata, ...updates.metadata };
    }
    session.updatedAt = new Date();

    return session;
  }

  createCheckpoint(
    sessionId: string,
    label?: string,
    metadata?: Record<string, unknown>
  ): SessionCheckpoint | null {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const checkpoint: SessionCheckpoint = {
      id: `checkpoint_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      sessionId,
      createdAt: new Date(),
      state: this.cloneState(session.state),
      label,
      metadata,
    };

    const checkpoints = this.checkpoints.get(sessionId) ?? [];
    checkpoints.push(checkpoint);

    if (checkpoints.length > (this.config.maxCheckpoints ?? 10)) {
      checkpoints.shift();
    }

    this.checkpoints.set(sessionId, checkpoints);
    session.checkpoints = checkpoints;

    return checkpoint;
  }

  rollback(sessionId: string, checkpointId: string): AgentSession | null {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const checkpoints = this.checkpoints.get(sessionId) ?? [];
    const checkpoint = checkpoints.find((c) => c.id === checkpointId);
    if (!checkpoint) {
      return null;
    }

    session.state = this.cloneState(checkpoint.state);
    session.updatedAt = new Date();

    const checkpointIndex = checkpoints.indexOf(checkpoint);
    this.checkpoints.set(sessionId, checkpoints.slice(0, checkpointIndex + 1));
    session.checkpoints = checkpoints.slice(0, checkpointIndex + 1);

    return session;
  }

  getCheckpoints(sessionId: string): SessionCheckpoint[] {
    return this.checkpoints.get(sessionId) ?? [];
  }

  addConversationTurn(
    sessionId: string,
    role: ConversationTurn["role"],
    content: string,
    metadata?: Record<string, unknown>
  ): boolean {
    const history = this.histories.get(sessionId);
    if (!history) {
      return false;
    }

    history.turns.push({
      role,
      content,
      timestamp: new Date(),
      metadata,
    });
    history.lastUpdated = new Date();

    return true;
  }

  getConversationHistory(sessionId: string): ConversationHistory | null {
    return this.histories.get(sessionId) ?? null;
  }

  updateConversationSummary(sessionId: string, summary: string): boolean {
    const history = this.histories.get(sessionId);
    if (!history) {
      return false;
    }

    history.summary = summary;
    history.lastUpdated = new Date();

    return true;
  }

  deleteSession(sessionId: string): boolean {
    this.sessions.delete(sessionId);
    this.checkpoints.delete(sessionId);
    this.histories.delete(sessionId);
    return true;
  }

  listSessions(teamId?: string, userId?: string): AgentSession[] {
    const sessions: AgentSession[] = [];

    for (const session of this.sessions.values()) {
      if (this.isExpired(session)) {
        this.expireSession(session);
        continue;
      }

      if (teamId && session.teamId !== teamId) {
        continue;
      }
      if (userId && session.userId !== userId) {
        continue;
      }

      sessions.push(session);
    }

    return sessions.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  cleanupExpiredSessions(): number {
    let cleaned = 0;

    for (const session of this.sessions.values()) {
      if (this.isExpired(session)) {
        this.expireSession(session);
        cleaned += 1;
      }
    }

    return cleaned;
  }

  private isExpired(session: AgentSession): boolean {
    if (!session.expiresAt) {
      return false;
    }
    return new Date() > session.expiresAt;
  }

  private expireSession(session: AgentSession): void {
    this.config.onSessionExpire?.(session);
    this.deleteSession(session.id);
  }

  private cloneState(state: AgentState): AgentState {
    return {
      values: new Map(state.values),
      history: [...state.history],
    };
  }
}

export const sessionManager = new SessionManager();
