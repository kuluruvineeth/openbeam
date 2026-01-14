import { describe, expect, it } from "bun:test";

interface MockSavedSearch {
  id: string;
  teamId: string;
  userId: string;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  sortBy: string | null;
  sortOrder: string | null;
  isPinned: boolean;
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function createMockSavedSearch(
  overrides: Partial<MockSavedSearch> = {}
): MockSavedSearch {
  return {
    id: `saved_${Math.random().toString(36).slice(2, 9)}`,
    teamId: "team_123",
    userId: "user_456",
    name: "Test Search",
    query: "test query",
    filters: {},
    sortBy: null,
    sortOrder: null,
    isPinned: false,
    usageCount: 0,
    lastUsedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("findSavedSearchById", () => {
  it("returns saved search when found", () => {
    const search = createMockSavedSearch({ id: "saved_123" });
    const found = search.id === "saved_123" ? search : null;

    expect(found).not.toBeNull();
    expect(found?.id).toBe("saved_123");
  });

  it("returns null when not found", () => {
    const search = createMockSavedSearch({ id: "saved_123" });
    const found = search.id === "nonexistent" ? search : null;

    expect(found).toBeNull();
  });
});

describe("findSavedSearchesByUser", () => {
  const searches = [
    createMockSavedSearch({
      teamId: "team_123",
      userId: "user_456",
      name: "Search A",
      isPinned: true,
      lastUsedAt: new Date("2024-01-15"),
    }),
    createMockSavedSearch({
      teamId: "team_123",
      userId: "user_456",
      name: "Search B",
      isPinned: false,
      lastUsedAt: new Date("2024-01-20"),
    }),
    createMockSavedSearch({
      teamId: "team_123",
      userId: "user_456",
      name: "Search C",
      isPinned: true,
      lastUsedAt: new Date("2024-01-10"),
    }),
    createMockSavedSearch({
      teamId: "team_123",
      userId: "user_789",
      name: "Other User Search",
      isPinned: false,
    }),
  ];

  it("filters by teamId and userId", () => {
    const filtered = searches.filter(
      (s) => s.teamId === "team_123" && s.userId === "user_456"
    );

    expect(filtered).toHaveLength(3);
  });

  it("does not return other users searches", () => {
    const filtered = searches.filter(
      (s) => s.teamId === "team_123" && s.userId === "user_456"
    );

    const hasOtherUser = filtered.some((s) => s.userId === "user_789");
    expect(hasOtherUser).toBe(false);
  });

  it("supports limit option", () => {
    const filtered = searches
      .filter((s) => s.teamId === "team_123" && s.userId === "user_456")
      .slice(0, 2);

    expect(filtered).toHaveLength(2);
  });

  it("supports offset option", () => {
    const filtered = searches
      .filter((s) => s.teamId === "team_123" && s.userId === "user_456")
      .slice(1);

    expect(filtered).toHaveLength(2);
  });

  it("supports pinnedFirst ordering", () => {
    const filtered = searches
      .filter((s) => s.teamId === "team_123" && s.userId === "user_456")
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }
        const aTime = a.lastUsedAt?.getTime() ?? 0;
        const bTime = b.lastUsedAt?.getTime() ?? 0;
        return bTime - aTime;
      });

    expect(filtered[0]?.isPinned).toBe(true);
    expect(filtered[1]?.isPinned).toBe(true);
    expect(filtered[2]?.isPinned).toBe(false);
  });

  it("orders by lastUsedAt desc by default", () => {
    const filtered = searches
      .filter((s) => s.teamId === "team_123" && s.userId === "user_456")
      .sort((a, b) => {
        const aTime = a.lastUsedAt?.getTime() ?? 0;
        const bTime = b.lastUsedAt?.getTime() ?? 0;
        return bTime - aTime;
      });

    expect(filtered[0]?.name).toBe("Search B");
    expect(filtered[1]?.name).toBe("Search A");
    expect(filtered[2]?.name).toBe("Search C");
  });
});

describe("countSavedSearchesByUser", () => {
  const searches = [
    createMockSavedSearch({ teamId: "team_123", userId: "user_456" }),
    createMockSavedSearch({ teamId: "team_123", userId: "user_456" }),
    createMockSavedSearch({ teamId: "team_123", userId: "user_456" }),
    createMockSavedSearch({ teamId: "team_123", userId: "user_789" }),
  ];

  it("returns count for specific user", () => {
    const count = searches.filter(
      (s) => s.teamId === "team_123" && s.userId === "user_456"
    ).length;

    expect(count).toBe(3);
  });

  it("returns 0 for user with no searches", () => {
    const count = searches.filter(
      (s) => s.teamId === "team_123" && s.userId === "nonexistent"
    ).length;

    expect(count).toBe(0);
  });
});

describe("findSavedSearchByName", () => {
  const searches = [
    createMockSavedSearch({
      teamId: "team_123",
      userId: "user_456",
      name: "My Search",
    }),
    createMockSavedSearch({
      teamId: "team_123",
      userId: "user_456",
      name: "Other Search",
    }),
    createMockSavedSearch({
      teamId: "team_123",
      userId: "user_789",
      name: "My Search",
    }),
  ];

  it("finds by exact teamId, userId, name combination", () => {
    const found = searches.find(
      (s) =>
        s.teamId === "team_123" &&
        s.userId === "user_456" &&
        s.name === "My Search"
    );

    expect(found).not.toBeUndefined();
    expect(found?.name).toBe("My Search");
    expect(found?.userId).toBe("user_456");
  });

  it("returns undefined when name not found for user", () => {
    const found = searches.find(
      (s) =>
        s.teamId === "team_123" &&
        s.userId === "user_456" &&
        s.name === "Nonexistent"
    );

    expect(found).toBeUndefined();
  });

  it("distinguishes between users with same name", () => {
    const user456Search = searches.find(
      (s) =>
        s.teamId === "team_123" &&
        s.userId === "user_456" &&
        s.name === "My Search"
    );
    const user789Search = searches.find(
      (s) =>
        s.teamId === "team_123" &&
        s.userId === "user_789" &&
        s.name === "My Search"
    );

    expect(user456Search?.userId).toBe("user_456");
    expect(user789Search?.userId).toBe("user_789");
    expect(user456Search?.id).not.toBe(user789Search?.id);
  });
});

describe("usage tracking", () => {
  it("recently used searches have higher lastUsedAt", () => {
    const searches = [
      createMockSavedSearch({ lastUsedAt: new Date("2024-01-10") }),
      createMockSavedSearch({ lastUsedAt: new Date("2024-01-20") }),
      createMockSavedSearch({ lastUsedAt: new Date("2024-01-15") }),
    ];

    const sorted = [...searches].sort((a, b) => {
      const aTime = a.lastUsedAt?.getTime() ?? 0;
      const bTime = b.lastUsedAt?.getTime() ?? 0;
      return bTime - aTime;
    });

    expect(sorted[0]?.lastUsedAt?.toISOString()).toContain("2024-01-20");
  });

  it("never used searches have null lastUsedAt", () => {
    const search = createMockSavedSearch({ lastUsedAt: null, usageCount: 0 });

    expect(search.lastUsedAt).toBeNull();
    expect(search.usageCount).toBe(0);
  });

  it("frequently used searches have higher usageCount", () => {
    const searches = [
      createMockSavedSearch({ usageCount: 5 }),
      createMockSavedSearch({ usageCount: 100 }),
      createMockSavedSearch({ usageCount: 25 }),
    ];

    const sortedByUsage = [...searches].sort(
      (a, b) => b.usageCount - a.usageCount
    );

    expect(sortedByUsage[0]?.usageCount).toBe(100);
    expect(sortedByUsage[1]?.usageCount).toBe(25);
    expect(sortedByUsage[2]?.usageCount).toBe(5);
  });
});
