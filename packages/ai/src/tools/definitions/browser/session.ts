import type { Browser, BrowserContext, Page } from "playwright-core";

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 30 * 1000;

function noop() {
  return;
}

interface BrowserSession {
  id: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  createdAt: number;
  lastActivity: number;
}

const sessions = new Map<string, BrowserSession>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanupTimer(): void {
  if (cleanupTimer) {
    return;
  }

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
        closeSession(id).catch(noop);
      }
    }

    if (sessions.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL_MS);

  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `browser_${timestamp}_${random}`;
}

export function storeSession(
  browser: Browser,
  context: BrowserContext,
  page: Page
): BrowserSession {
  const id = generateSessionId();
  const now = Date.now();
  const session: BrowserSession = {
    id,
    browser,
    context,
    page,
    createdAt: now,
    lastActivity: now,
  };

  sessions.set(id, session);
  startCleanupTimer();
  return session;
}

export function getActiveSession(): BrowserSession | undefined {
  const first = sessions.values().next();
  return first.done ? undefined : first.value;
}

export function getSessionById(id: string): BrowserSession | undefined {
  const session = sessions.get(id);
  if (session) {
    session.lastActivity = Date.now();
  }
  return session;
}

export function touchSession(id: string): void {
  const session = sessions.get(id);
  if (session) {
    session.lastActivity = Date.now();
  }
}

export async function closeSession(id: string): Promise<void> {
  const session = sessions.get(id);
  if (!session) {
    return;
  }

  sessions.delete(id);

  try {
    await session.page.close().catch(noop);
    await session.context.close().catch(noop);
    await session.browser.close().catch(noop);
  } catch {
    noop();
  }
}

export async function closeAllSessions(): Promise<void> {
  const ids = [...sessions.keys()];
  await Promise.all(ids.map(closeSession));

  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

export function hasActiveSession(): boolean {
  return sessions.size > 0;
}

export function getSessionCount(): number {
  return sessions.size;
}

export function requireSession(): BrowserSession {
  const session = getActiveSession();
  if (!session) {
    throw new Error(
      "No active browser session. Use browser_launch to start one."
    );
  }
  return session;
}

export type { BrowserSession };
