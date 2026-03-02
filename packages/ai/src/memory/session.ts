import {
  type SessionMemory,
  SessionMemorySchema,
  type SessionMessage,
  type SessionMessageRole,
} from "@openplane/types/ai";
import type { ShortTermMemoryClient } from "./short-term";

const TWENTY_FOUR_HOURS_SECONDS = 86_400;
const DEFAULT_MAX_MESSAGES = 200;
const SESSION_KEY_PREFIX = "memory:session:";
const SUMMARY_KEY_SUFFIX = ":summary";

export interface SessionMemoryOptions {
  client: ShortTermMemoryClient;
  teamId: string;
  sessionId: string;
  maxMessages?: number;
  ttlSeconds?: number;
  estimateTokens?: (text: string) => number;
}

export interface SessionMemoryStore {
  append(
    role: SessionMessageRole,
    content: string,
    toolCalls?: Record<string, unknown>[]
  ): Promise<void>;
  getMessages(limit?: number): Promise<SessionMessage[]>;
  getAll(): Promise<SessionMemory | null>;
  clear(): Promise<void>;
  truncate(keepLast: number): Promise<number>;
  setSummary(summary: string): Promise<void>;
  getSummary(): Promise<string | null>;
  messageCount(): Promise<number>;
}

function buildSessionKey(teamId: string, sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${teamId}:${sessionId}`;
}

function buildSummaryKey(teamId: string, sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${teamId}:${sessionId}${SUMMARY_KEY_SUFFIX}`;
}

export class SessionMemoryStoreImpl implements SessionMemoryStore {
  private readonly client: ShortTermMemoryClient;
  private readonly teamId: string;
  private readonly sessionId: string;
  private readonly maxMessages: number;
  private readonly ttlSeconds: number;
  private readonly sessionKey: string;
  private readonly summaryKey: string;
  private pendingMutex: Promise<void> = Promise.resolve();

  constructor(options: SessionMemoryOptions) {
    this.client = options.client;
    this.teamId = options.teamId;
    this.sessionId = options.sessionId;
    this.maxMessages = options.maxMessages ?? DEFAULT_MAX_MESSAGES;
    this.ttlSeconds = options.ttlSeconds ?? TWENTY_FOUR_HOURS_SECONDS;
    this.sessionKey = buildSessionKey(this.teamId, this.sessionId);
    this.summaryKey = buildSummaryKey(this.teamId, this.sessionId);
  }

  private async withMutex<T>(fn: () => Promise<T>): Promise<T> {
    let release: (() => void) | undefined;
    const acquired = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = this.pendingMutex;
    this.pendingMutex = acquired;
    await previous;
    try {
      return await fn();
    } finally {
      release?.();
    }
  }

  async append(
    role: SessionMessageRole,
    content: string,
    toolCalls?: Record<string, unknown>[]
  ): Promise<void> {
    await this.withMutex(async () => {
      const message: SessionMessage = {
        role,
        content,
        timestamp: Date.now(),
        toolCalls,
      };

      const existing = await this.loadSession();
      existing.messages.push(message);
      existing.lastActivityAt = Date.now();

      if (existing.messages.length > this.maxMessages) {
        const overflow = existing.messages.length - this.maxMessages;
        existing.messages = existing.messages.slice(overflow);
      }

      await this.saveSession(existing);
    });
  }

  async getMessages(limit?: number): Promise<SessionMessage[]> {
    const session = await this.loadSession();
    if (!limit || session.messages.length <= limit) {
      return session.messages;
    }
    return session.messages.slice(-limit);
  }

  async getAll(): Promise<SessionMemory | null> {
    const raw = await this.client.get(this.sessionKey);
    if (!raw) {
      return null;
    }
    return SessionMemorySchema.parse(JSON.parse(raw));
  }

  async clear(): Promise<void> {
    await this.client.del(this.sessionKey);
    await this.client.del(this.summaryKey);
  }

  truncate(keepLast: number): Promise<number> {
    return this.withMutex(async () => {
      const session = await this.loadSession();
      const originalCount = session.messages.length;

      if (originalCount <= keepLast) {
        return 0;
      }

      session.messages = session.messages.slice(-keepLast);
      await this.saveSession(session);

      return originalCount - keepLast;
    });
  }

  async setSummary(summary: string): Promise<void> {
    await this.withMutex(async () => {
      const session = await this.loadSession();
      session.summary = summary;
      await this.saveSession(session);
      await this.client.set(this.summaryKey, summary, this.ttlSeconds);
    });
  }

  async getSummary(): Promise<string | null> {
    const cached = await this.client.get(this.summaryKey);
    if (cached) {
      return cached;
    }
    const session = await this.getAll();
    return session?.summary ?? null;
  }

  async messageCount(): Promise<number> {
    const session = await this.getAll();
    return session?.messages.length ?? 0;
  }

  private async loadSession(): Promise<SessionMemory> {
    const raw = await this.client.get(this.sessionKey);
    if (raw) {
      return SessionMemorySchema.parse(JSON.parse(raw));
    }

    return {
      sessionId: this.sessionId,
      teamId: this.teamId,
      messages: [],
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };
  }

  private async saveSession(session: SessionMemory): Promise<void> {
    const serialized = JSON.stringify(session);
    await this.client.set(this.sessionKey, serialized, this.ttlSeconds);
  }
}

export function createSessionMemory(
  options: SessionMemoryOptions
): SessionMemoryStore {
  return new SessionMemoryStoreImpl(options);
}
