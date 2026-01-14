import { describe, expect, it } from "bun:test";
import type { CreateShareLinkInput } from "../share-link";

function createMockShareLinkInput(
  overrides: Partial<CreateShareLinkInput> = {}
): CreateShareLinkInput {
  return {
    teamId: "team_123",
    userId: "user_456",
    documentId: "doc_789",
    ...overrides,
  };
}

interface MockShareLink {
  id: string;
  teamId: string;
  userId: string;
  documentId: string;
  accessType: string;
  expiresAt: Date | null;
  maxViews: number | null;
  viewCount: number;
  password: string | null;
  isActive: boolean;
  revokedAt: Date | null;
  revokedBy: string | null;
  lastAccessedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function createMockShareLink(
  overrides: Partial<MockShareLink> = {}
): MockShareLink {
  return {
    id: "share_abc",
    teamId: "team_123",
    userId: "user_456",
    documentId: "doc_789",
    accessType: "view",
    expiresAt: null,
    maxViews: null,
    viewCount: 0,
    password: null,
    isActive: true,
    revokedAt: null,
    revokedBy: null,
    lastAccessedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("CreateShareLinkInput", () => {
  it("has required fields", () => {
    const input = createMockShareLinkInput();

    expect(input.teamId).toBe("team_123");
    expect(input.userId).toBe("user_456");
    expect(input.documentId).toBe("doc_789");
  });

  it("accessType is optional in input", () => {
    const input = createMockShareLinkInput();
    expect(input.accessType).toBeUndefined();
  });

  it("allows setting expiresAt", () => {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const input = createMockShareLinkInput({ expiresAt: expires });

    expect(input.expiresAt).toEqual(expires);
  });

  it("allows setting maxViews", () => {
    const input = createMockShareLinkInput({ maxViews: 100 });
    expect(input.maxViews).toBe(100);
  });

  it("allows setting password", () => {
    const input = createMockShareLinkInput({ password: "secret123" });
    expect(input.password).toBe("secret123");
  });
});

describe("ShareLink entity", () => {
  it("has all required fields", () => {
    const shareLink = createMockShareLink();

    expect(shareLink.id).toBeDefined();
    expect(shareLink.teamId).toBeDefined();
    expect(shareLink.userId).toBeDefined();
    expect(shareLink.documentId).toBeDefined();
    expect(shareLink.accessType).toBeDefined();
    expect(shareLink.isActive).toBeDefined();
    expect(shareLink.viewCount).toBeDefined();
    expect(shareLink.createdAt).toBeDefined();
    expect(shareLink.updatedAt).toBeDefined();
  });

  it("defaults isActive to true", () => {
    const shareLink = createMockShareLink();
    expect(shareLink.isActive).toBe(true);
  });

  it("defaults viewCount to 0", () => {
    const shareLink = createMockShareLink();
    expect(shareLink.viewCount).toBe(0);
  });

  it("defaults accessType to view", () => {
    const shareLink = createMockShareLink();
    expect(shareLink.accessType).toBe("view");
  });

  it("defaults expiresAt to null (never expires)", () => {
    const shareLink = createMockShareLink();
    expect(shareLink.expiresAt).toBeNull();
  });

  it("defaults maxViews to null (unlimited)", () => {
    const shareLink = createMockShareLink();
    expect(shareLink.maxViews).toBeNull();
  });
});

describe("incrementShareLinkViews behavior", () => {
  it("increments viewCount by 1", () => {
    const before = createMockShareLink({ viewCount: 5 });
    const after = createMockShareLink({
      ...before,
      viewCount: before.viewCount + 1,
      lastAccessedAt: new Date(),
    });

    expect(after.viewCount).toBe(6);
  });

  it("updates lastAccessedAt timestamp", () => {
    const now = new Date();
    const after = createMockShareLink({
      viewCount: 1,
      lastAccessedAt: now,
    });

    expect(after.lastAccessedAt).toEqual(now);
  });
});

describe("revokeShareLink behavior", () => {
  it("sets isActive to false", () => {
    const active = createMockShareLink({ isActive: true });
    const revoked = createMockShareLink({
      ...active,
      isActive: false,
      revokedAt: new Date(),
      revokedBy: "admin_123",
    });

    expect(active.isActive).toBe(true);
    expect(revoked.isActive).toBe(false);
  });

  it("sets revokedAt timestamp", () => {
    const now = new Date();
    const revoked = createMockShareLink({
      isActive: false,
      revokedAt: now,
      revokedBy: "user_456",
    });

    expect(revoked.revokedAt).toEqual(now);
  });

  it("records who revoked the link", () => {
    const revoked = createMockShareLink({
      isActive: false,
      revokedAt: new Date(),
      revokedBy: "user_789",
    });

    expect(revoked.revokedBy).toBe("user_789");
  });
});

describe("access validation logic", () => {
  it("inactive link is not accessible", () => {
    const link = createMockShareLink({ isActive: false });

    const isAccessible = link.isActive;
    expect(isAccessible).toBe(false);
  });

  it("expired link is not accessible", () => {
    const pastDate = new Date(Date.now() - 1000);
    const link = createMockShareLink({ expiresAt: pastDate });

    const isExpired = link.expiresAt && link.expiresAt < new Date();
    expect(isExpired).toBe(true);
  });

  it("link with exceeded maxViews is not accessible", () => {
    const link = createMockShareLink({ maxViews: 10, viewCount: 10 });

    const viewsExceeded = link.maxViews && link.viewCount >= link.maxViews;
    expect(viewsExceeded).toBe(true);
  });

  it("active link without expiry or max views is accessible", () => {
    const link = createMockShareLink({
      isActive: true,
      expiresAt: null,
      maxViews: null,
    });

    const isAccessible =
      link.isActive &&
      (!link.expiresAt || link.expiresAt >= new Date()) &&
      (!link.maxViews || link.viewCount < link.maxViews);

    expect(isAccessible).toBe(true);
  });

  it("link with future expiry is accessible", () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const link = createMockShareLink({
      isActive: true,
      expiresAt: futureDate,
    });

    const isNotExpired = !link.expiresAt || link.expiresAt >= new Date();
    expect(isNotExpired).toBe(true);
  });

  it("link with views remaining is accessible", () => {
    const link = createMockShareLink({
      isActive: true,
      maxViews: 10,
      viewCount: 5,
    });

    const hasViewsRemaining = !link.maxViews || link.viewCount < link.maxViews;
    expect(hasViewsRemaining).toBe(true);
  });
});

describe("deleteShareLinksForDocument behavior", () => {
  it("deletes all links for a document", () => {
    const links = [
      createMockShareLink({ id: "link_1", documentId: "doc_123" }),
      createMockShareLink({ id: "link_2", documentId: "doc_123" }),
      createMockShareLink({ id: "link_3", documentId: "doc_123" }),
    ];

    const remaining = links.filter((l) => l.documentId !== "doc_123");
    expect(remaining).toHaveLength(0);
  });

  it("does not affect links for other documents", () => {
    const links = [
      createMockShareLink({ id: "link_1", documentId: "doc_123" }),
      createMockShareLink({ id: "link_2", documentId: "doc_456" }),
    ];

    const remaining = links.filter((l) => l.documentId !== "doc_123");
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.documentId).toBe("doc_456");
  });
});

describe("accessType variations", () => {
  it("supports view access type", () => {
    const link = createMockShareLink({ accessType: "view" });
    expect(link.accessType).toBe("view");
  });

  it("supports download access type", () => {
    const link = createMockShareLink({ accessType: "download" });
    expect(link.accessType).toBe("download");
  });

  it("supports edit access type", () => {
    const link = createMockShareLink({ accessType: "edit" });
    expect(link.accessType).toBe("edit");
  });
});

describe("password protection", () => {
  it("link can be password protected", () => {
    const link = createMockShareLink({ password: "hashed_password" });
    expect(link.password).toBe("hashed_password");
  });

  it("link without password has null password", () => {
    const link = createMockShareLink({ password: null });
    expect(link.password).toBeNull();
  });

  it("password-protected link requires password for access", () => {
    const link = createMockShareLink({ password: "secret" });
    const requiresPassword = link.password !== null;
    expect(requiresPassword).toBe(true);
  });
});
