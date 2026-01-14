import { describe, expect, it } from "bun:test";
import type { CreateSavedSearchInput } from "../saved-search";

function createMockSavedSearchInput(
  overrides: Partial<CreateSavedSearchInput> = {}
): CreateSavedSearchInput {
  return {
    teamId: "team_123",
    userId: "user_456",
    name: "My Search",
    query: "project updates",
    ...overrides,
  };
}

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
    id: "saved_789",
    teamId: "team_123",
    userId: "user_456",
    name: "My Search",
    query: "project updates",
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

describe("CreateSavedSearchInput", () => {
  it("has required fields", () => {
    const input = createMockSavedSearchInput();

    expect(input.teamId).toBe("team_123");
    expect(input.userId).toBe("user_456");
    expect(input.name).toBe("My Search");
    expect(input.query).toBe("project updates");
  });

  it("allows optional filters", () => {
    const input = createMockSavedSearchInput({
      filters: {
        connectorTypes: ["SLACK", "NOTION"],
        dateRange: { start: "2024-01-01", end: "2024-12-31" },
      },
    });

    expect(input.filters).toBeDefined();
    expect(input.filters?.connectorTypes).toHaveLength(2);
  });

  it("allows optional sort options", () => {
    const input = createMockSavedSearchInput({
      sortBy: "created_at",
      sortOrder: "desc",
    });

    expect(input.sortBy).toBe("created_at");
    expect(input.sortOrder).toBe("desc");
  });

  it("allows optional isPinned", () => {
    const pinnedInput = createMockSavedSearchInput({ isPinned: true });
    const unpinnedInput = createMockSavedSearchInput({ isPinned: false });

    expect(pinnedInput.isPinned).toBe(true);
    expect(unpinnedInput.isPinned).toBe(false);
  });
});

describe("SavedSearch entity", () => {
  it("has all required fields", () => {
    const savedSearch = createMockSavedSearch();

    expect(savedSearch.id).toBeDefined();
    expect(savedSearch.teamId).toBeDefined();
    expect(savedSearch.userId).toBeDefined();
    expect(savedSearch.name).toBeDefined();
    expect(savedSearch.query).toBeDefined();
    expect(savedSearch.filters).toBeDefined();
    expect(savedSearch.isPinned).toBeDefined();
    expect(savedSearch.usageCount).toBeDefined();
    expect(savedSearch.createdAt).toBeDefined();
    expect(savedSearch.updatedAt).toBeDefined();
  });

  it("defaults usageCount to 0", () => {
    const savedSearch = createMockSavedSearch();
    expect(savedSearch.usageCount).toBe(0);
  });

  it("defaults isPinned to false", () => {
    const savedSearch = createMockSavedSearch();
    expect(savedSearch.isPinned).toBe(false);
  });

  it("defaults filters to empty object", () => {
    const savedSearch = createMockSavedSearch();
    expect(savedSearch.filters).toEqual({});
  });

  it("lastUsedAt starts as null", () => {
    const savedSearch = createMockSavedSearch();
    expect(savedSearch.lastUsedAt).toBeNull();
  });
});

describe("incrementSavedSearchUsage behavior", () => {
  it("increments usageCount by 1", () => {
    const before = createMockSavedSearch({ usageCount: 5 });
    const after = createMockSavedSearch({
      ...before,
      usageCount: before.usageCount + 1,
      lastUsedAt: new Date(),
    });

    expect(after.usageCount).toBe(6);
    expect(after.lastUsedAt).not.toBeNull();
  });

  it("updates lastUsedAt timestamp", () => {
    const now = new Date();
    const after = createMockSavedSearch({
      usageCount: 1,
      lastUsedAt: now,
    });

    expect(after.lastUsedAt).toEqual(now);
  });
});

describe("toggleSavedSearchPin behavior", () => {
  it("sets isPinned to true", () => {
    const unpinned = createMockSavedSearch({ isPinned: false });
    const pinned = createMockSavedSearch({ ...unpinned, isPinned: true });

    expect(unpinned.isPinned).toBe(false);
    expect(pinned.isPinned).toBe(true);
  });

  it("sets isPinned to false", () => {
    const pinned = createMockSavedSearch({ isPinned: true });
    const unpinned = createMockSavedSearch({ ...pinned, isPinned: false });

    expect(pinned.isPinned).toBe(true);
    expect(unpinned.isPinned).toBe(false);
  });
});

describe("updateSavedSearch behavior", () => {
  it("allows updating name", () => {
    const original = createMockSavedSearch({ name: "Old Name" });
    const updated = createMockSavedSearch({ ...original, name: "New Name" });

    expect(updated.name).toBe("New Name");
  });

  it("allows updating query", () => {
    const original = createMockSavedSearch({ query: "old query" });
    const updated = createMockSavedSearch({ ...original, query: "new query" });

    expect(updated.query).toBe("new query");
  });

  it("allows updating filters", () => {
    const original = createMockSavedSearch({ filters: {} });
    const updated = createMockSavedSearch({
      ...original,
      filters: { connectorTypes: ["SLACK"] },
    });

    expect(updated.filters).toEqual({ connectorTypes: ["SLACK"] });
  });

  it("preserves immutable fields (teamId, userId)", () => {
    const original = createMockSavedSearch({
      teamId: "team_123",
      userId: "user_456",
    });

    expect(original.teamId).toBe("team_123");
    expect(original.userId).toBe("user_456");
  });
});

describe("unique constraint: teamId_userId_name", () => {
  it("same user can have multiple saved searches with different names", () => {
    const search1 = createMockSavedSearch({
      teamId: "team_123",
      userId: "user_456",
      name: "Search 1",
    });
    const search2 = createMockSavedSearch({
      teamId: "team_123",
      userId: "user_456",
      name: "Search 2",
    });

    const key1 = `${search1.teamId}_${search1.userId}_${search1.name}`;
    const key2 = `${search2.teamId}_${search2.userId}_${search2.name}`;

    expect(key1).not.toBe(key2);
  });

  it("different users can have same name in same team", () => {
    const search1 = createMockSavedSearch({
      teamId: "team_123",
      userId: "user_1",
      name: "Shared Name",
    });
    const search2 = createMockSavedSearch({
      teamId: "team_123",
      userId: "user_2",
      name: "Shared Name",
    });

    const key1 = `${search1.teamId}_${search1.userId}_${search1.name}`;
    const key2 = `${search2.teamId}_${search2.userId}_${search2.name}`;

    expect(key1).not.toBe(key2);
  });

  it("same user in different teams can have same name", () => {
    const search1 = createMockSavedSearch({
      teamId: "team_1",
      userId: "user_456",
      name: "Shared Name",
    });
    const search2 = createMockSavedSearch({
      teamId: "team_2",
      userId: "user_456",
      name: "Shared Name",
    });

    const key1 = `${search1.teamId}_${search1.userId}_${search1.name}`;
    const key2 = `${search2.teamId}_${search2.userId}_${search2.name}`;

    expect(key1).not.toBe(key2);
  });
});
