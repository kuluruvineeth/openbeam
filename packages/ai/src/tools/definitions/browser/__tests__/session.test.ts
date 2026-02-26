import { afterEach, describe, expect, it, mock } from "bun:test";

const SESSION_ID_PATTERN = /^browser_/;

import {
  closeAllSessions,
  closeSession,
  getActiveSession,
  getSessionById,
  getSessionCount,
  hasActiveSession,
  requireSession,
  storeSession,
} from "../session";

function createMockBrowser() {
  return {
    close: mock(() => Promise.resolve()),
    contexts: mock(() => []),
    isConnected: mock(() => true),
    newContext: mock(() => Promise.resolve(createMockContext())),
    newPage: mock(() => Promise.resolve(createMockPage())),
    version: mock(() => "mock"),
  } as unknown as Parameters<typeof storeSession>[0];
}

function createMockContext() {
  return {
    close: mock(() => Promise.resolve()),
    pages: mock(() => []),
    newPage: mock(() => Promise.resolve(createMockPage())),
  } as unknown as Parameters<typeof storeSession>[1];
}

function createMockPage() {
  return {
    close: mock(() => Promise.resolve()),
    url: mock(() => "about:blank"),
    title: mock(() => Promise.resolve("")),
    goto: mock(() => Promise.resolve(null)),
  } as unknown as Parameters<typeof storeSession>[2];
}

describe("session management", () => {
  afterEach(async () => {
    await closeAllSessions();
  });

  describe("storeSession", () => {
    it("creates a session with a unique ID", () => {
      const browser = createMockBrowser();
      const context = createMockContext();
      const page = createMockPage();

      const session = storeSession(browser, context, page);
      expect(session.id).toMatch(SESSION_ID_PATTERN);
      expect(session.browser).toBe(browser);
      expect(session.context).toBe(context);
      expect(session.page).toBe(page);
      expect(session.createdAt).toBeGreaterThan(0);
      expect(session.lastActivity).toBeGreaterThan(0);
    });

    it("generates unique IDs for different sessions", () => {
      const session1 = storeSession(
        createMockBrowser(),
        createMockContext(),
        createMockPage()
      );
      const session2 = storeSession(
        createMockBrowser(),
        createMockContext(),
        createMockPage()
      );
      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe("getActiveSession", () => {
    it("returns undefined when no sessions exist", () => {
      expect(getActiveSession()).toBeUndefined();
    });

    it("returns the active session", () => {
      const browser = createMockBrowser();
      const context = createMockContext();
      const page = createMockPage();

      storeSession(browser, context, page);
      const session = getActiveSession();

      expect(session).toBeDefined();
      expect(session?.browser).toBe(browser);
    });

    it("updates lastActivity on access", () => {
      storeSession(createMockBrowser(), createMockContext(), createMockPage());
      const before = getActiveSession()?.lastActivity ?? 0;

      const session = getActiveSession();
      expect(session?.lastActivity).toBeGreaterThanOrEqual(before);
    });
  });

  describe("getSessionById", () => {
    it("returns session by ID", () => {
      const stored = storeSession(
        createMockBrowser(),
        createMockContext(),
        createMockPage()
      );
      const retrieved = getSessionById(stored.id);
      expect(retrieved?.id).toBe(stored.id);
    });

    it("returns undefined for unknown ID", () => {
      expect(getSessionById("nonexistent")).toBeUndefined();
    });
  });

  describe("hasActiveSession", () => {
    it("returns false when no sessions", () => {
      expect(hasActiveSession()).toBe(false);
    });

    it("returns true when session exists", () => {
      storeSession(createMockBrowser(), createMockContext(), createMockPage());
      expect(hasActiveSession()).toBe(true);
    });
  });

  describe("getSessionCount", () => {
    it("returns 0 when no sessions", () => {
      expect(getSessionCount()).toBe(0);
    });

    it("returns correct count", () => {
      storeSession(createMockBrowser(), createMockContext(), createMockPage());
      storeSession(createMockBrowser(), createMockContext(), createMockPage());
      expect(getSessionCount()).toBe(2);
    });
  });

  describe("closeSession", () => {
    it("removes the session", async () => {
      const stored = storeSession(
        createMockBrowser(),
        createMockContext(),
        createMockPage()
      );
      expect(hasActiveSession()).toBe(true);

      await closeSession(stored.id);
      expect(hasActiveSession()).toBe(false);
    });

    it("calls close on browser, context, and page", async () => {
      const browser = createMockBrowser();
      const context = createMockContext();
      const page = createMockPage();

      const stored = storeSession(browser, context, page);
      await closeSession(stored.id);

      expect(page.close).toHaveBeenCalled();
      expect(context.close).toHaveBeenCalled();
      expect(browser.close).toHaveBeenCalled();
    });

    it("handles nonexistent session gracefully", async () => {
      await closeSession("nonexistent");
    });
  });

  describe("closeAllSessions", () => {
    it("closes all sessions", async () => {
      storeSession(createMockBrowser(), createMockContext(), createMockPage());
      storeSession(createMockBrowser(), createMockContext(), createMockPage());

      expect(getSessionCount()).toBe(2);

      await closeAllSessions();
      expect(getSessionCount()).toBe(0);
    });
  });

  describe("requireSession", () => {
    it("throws when no active session", () => {
      expect(() => requireSession()).toThrow("No active browser session");
    });

    it("returns active session", () => {
      storeSession(createMockBrowser(), createMockContext(), createMockPage());
      const session = requireSession();
      expect(session).toBeDefined();
      expect(session.id).toMatch(SESSION_ID_PATTERN);
    });
  });
});
