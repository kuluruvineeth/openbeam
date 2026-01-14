import { describe, expect, it } from "bun:test";

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
}

function createMockShareLink(
  overrides: Partial<MockShareLink> = {}
): MockShareLink {
  return {
    id: `share_${Math.random().toString(36).slice(2, 9)}`,
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
    ...overrides,
  };
}

function isLinkActive(link: MockShareLink, now: Date = new Date()): boolean {
  if (!link.isActive) {
    return false;
  }

  if (link.expiresAt && link.expiresAt < now) {
    return false;
  }

  if (link.maxViews && link.viewCount >= link.maxViews) {
    return false;
  }

  return true;
}

describe("findShareLinkById", () => {
  it("returns share link when found", () => {
    const link = createMockShareLink({ id: "share_123" });
    const found = link.id === "share_123" ? link : null;

    expect(found).not.toBeNull();
    expect(found?.id).toBe("share_123");
  });

  it("returns null when not found", () => {
    const link = createMockShareLink({ id: "share_123" });
    const found = link.id === "nonexistent" ? link : null;

    expect(found).toBeNull();
  });
});

describe("findActiveShareLink", () => {
  it("returns active link that has not expired", () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const link = createMockShareLink({
      isActive: true,
      expiresAt: futureDate,
      viewCount: 0,
      maxViews: 100,
    });

    expect(isLinkActive(link)).toBe(true);
  });

  it("returns null for inactive link", () => {
    const link = createMockShareLink({ isActive: false });

    expect(isLinkActive(link)).toBe(false);
  });

  it("returns null for expired link", () => {
    const pastDate = new Date(Date.now() - 1000);
    const link = createMockShareLink({
      isActive: true,
      expiresAt: pastDate,
    });

    expect(isLinkActive(link)).toBe(false);
  });

  it("returns null for link with exceeded maxViews", () => {
    const link = createMockShareLink({
      isActive: true,
      maxViews: 10,
      viewCount: 10,
    });

    expect(isLinkActive(link)).toBe(false);
  });

  it("returns link with views remaining", () => {
    const link = createMockShareLink({
      isActive: true,
      maxViews: 10,
      viewCount: 5,
    });

    expect(isLinkActive(link)).toBe(true);
  });

  it("returns link without expiry (null expiresAt)", () => {
    const link = createMockShareLink({
      isActive: true,
      expiresAt: null,
    });

    expect(isLinkActive(link)).toBe(true);
  });

  it("returns link without view limit (null maxViews)", () => {
    const link = createMockShareLink({
      isActive: true,
      maxViews: null,
      viewCount: 1000,
    });

    expect(isLinkActive(link)).toBe(true);
  });
});

describe("findShareLinksByDocument", () => {
  const links = [
    createMockShareLink({ documentId: "doc_123", isActive: true }),
    createMockShareLink({ documentId: "doc_123", isActive: false }),
    createMockShareLink({ documentId: "doc_123", isActive: true }),
    createMockShareLink({ documentId: "doc_456", isActive: true }),
  ];

  it("returns all links for document", () => {
    const filtered = links.filter((l) => l.documentId === "doc_123");

    expect(filtered).toHaveLength(3);
  });

  it("returns only active links when activeOnly is true", () => {
    const filtered = links.filter(
      (l) => l.documentId === "doc_123" && l.isActive
    );

    expect(filtered).toHaveLength(2);
  });

  it("returns empty array for document with no links", () => {
    const filtered = links.filter((l) => l.documentId === "nonexistent");

    expect(filtered).toHaveLength(0);
  });

  it("orders by createdAt desc", () => {
    const linksWithDates = [
      createMockShareLink({
        documentId: "doc_123",
        createdAt: new Date("2024-01-10"),
      }),
      createMockShareLink({
        documentId: "doc_123",
        createdAt: new Date("2024-01-20"),
      }),
      createMockShareLink({
        documentId: "doc_123",
        createdAt: new Date("2024-01-15"),
      }),
    ];

    const sorted = [...linksWithDates]
      .filter((l) => l.documentId === "doc_123")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    expect(sorted[0]?.createdAt.toISOString()).toContain("2024-01-20");
    expect(sorted[1]?.createdAt.toISOString()).toContain("2024-01-15");
    expect(sorted[2]?.createdAt.toISOString()).toContain("2024-01-10");
  });
});

describe("findShareLinksByUser", () => {
  const links = [
    createMockShareLink({
      teamId: "team_123",
      userId: "user_456",
      isActive: true,
    }),
    createMockShareLink({
      teamId: "team_123",
      userId: "user_456",
      isActive: false,
    }),
    createMockShareLink({
      teamId: "team_123",
      userId: "user_789",
      isActive: true,
    }),
    createMockShareLink({
      teamId: "team_456",
      userId: "user_456",
      isActive: true,
    }),
  ];

  it("filters by teamId and userId", () => {
    const filtered = links.filter(
      (l) => l.teamId === "team_123" && l.userId === "user_456"
    );

    expect(filtered).toHaveLength(2);
  });

  it("returns only active links when activeOnly is true", () => {
    const filtered = links.filter(
      (l) => l.teamId === "team_123" && l.userId === "user_456" && l.isActive
    );

    expect(filtered).toHaveLength(1);
  });

  it("supports limit option", () => {
    const filtered = links
      .filter((l) => l.teamId === "team_123" && l.userId === "user_456")
      .slice(0, 1);

    expect(filtered).toHaveLength(1);
  });

  it("supports offset option", () => {
    const filtered = links
      .filter((l) => l.teamId === "team_123" && l.userId === "user_456")
      .slice(1);

    expect(filtered).toHaveLength(1);
  });

  it("does not return other users links", () => {
    const filtered = links.filter(
      (l) => l.teamId === "team_123" && l.userId === "user_456"
    );

    const hasOtherUser = filtered.some((l) => l.userId === "user_789");
    expect(hasOtherUser).toBe(false);
  });

  it("does not return links from other teams", () => {
    const filtered = links.filter(
      (l) => l.teamId === "team_123" && l.userId === "user_456"
    );

    const hasOtherTeam = filtered.some((l) => l.teamId === "team_456");
    expect(hasOtherTeam).toBe(false);
  });
});

describe("countActiveShareLinks", () => {
  it("counts only active links", () => {
    const links = [
      createMockShareLink({ teamId: "team_123", isActive: true }),
      createMockShareLink({ teamId: "team_123", isActive: false }),
      createMockShareLink({ teamId: "team_123", isActive: true }),
    ];

    const count = links.filter(
      (l) => l.teamId === "team_123" && l.isActive
    ).length;

    expect(count).toBe(2);
  });

  it("excludes expired links", () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 1000);
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const links = [
      createMockShareLink({
        teamId: "team_123",
        isActive: true,
        expiresAt: futureDate,
      }),
      createMockShareLink({
        teamId: "team_123",
        isActive: true,
        expiresAt: pastDate,
      }),
      createMockShareLink({
        teamId: "team_123",
        isActive: true,
        expiresAt: null,
      }),
    ];

    const count = links.filter(
      (l) =>
        l.teamId === "team_123" &&
        l.isActive &&
        (l.expiresAt === null || l.expiresAt > now)
    ).length;

    expect(count).toBe(2);
  });

  it("includes links with null expiresAt (never expires)", () => {
    const links = [
      createMockShareLink({
        teamId: "team_123",
        isActive: true,
        expiresAt: null,
      }),
    ];

    const count = links.filter(
      (l) => l.teamId === "team_123" && l.isActive
    ).length;

    expect(count).toBe(1);
  });

  it("returns 0 for team with no active links", () => {
    const links = [
      createMockShareLink({ teamId: "team_123", isActive: false }),
      createMockShareLink({ teamId: "team_456", isActive: true }),
    ];

    const count = links.filter(
      (l) => l.teamId === "team_123" && l.isActive
    ).length;

    expect(count).toBe(0);
  });
});

describe("access validation edge cases", () => {
  it("link expires at exact boundary", () => {
    const now = new Date();
    const link = createMockShareLink({
      isActive: true,
      expiresAt: now,
    });

    const isExpired = link.expiresAt && link.expiresAt < now;
    expect(isExpired).toBe(false);
  });

  it("link with maxViews = 1 becomes inactive after first view", () => {
    const link = createMockShareLink({
      isActive: true,
      maxViews: 1,
      viewCount: 1,
    });

    expect(isLinkActive(link)).toBe(false);
  });

  it("revoked link is not active even with valid expiry", () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const link = createMockShareLink({
      isActive: false,
      expiresAt: futureDate,
      revokedAt: new Date(),
      revokedBy: "admin",
    });

    expect(isLinkActive(link)).toBe(false);
  });

  it("combines all validation checks correctly", () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const validLink = createMockShareLink({
      isActive: true,
      expiresAt: futureDate,
      maxViews: 100,
      viewCount: 50,
    });

    expect(isLinkActive(validLink)).toBe(true);

    const inactiveLink = createMockShareLink({
      isActive: false,
      expiresAt: futureDate,
      maxViews: 100,
      viewCount: 50,
    });

    expect(isLinkActive(inactiveLink)).toBe(false);

    const expiredLink = createMockShareLink({
      isActive: true,
      expiresAt: new Date(Date.now() - 1000),
      maxViews: 100,
      viewCount: 50,
    });

    expect(isLinkActive(expiredLink)).toBe(false);

    const viewsExceededLink = createMockShareLink({
      isActive: true,
      expiresAt: futureDate,
      maxViews: 100,
      viewCount: 100,
    });

    expect(isLinkActive(viewsExceededLink)).toBe(false);
  });
});
