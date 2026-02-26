import { describe, expect, it } from "bun:test";
import type {
  GitHubIssue,
  GitHubRepository,
  GitHubTransformContext,
} from "@openplane/types/services/connectors/github";
import { transformIssue } from "../transformers/issue";
import { transformRepository } from "../transformers/repository";

const baseContext: GitHubTransformContext = {
  connectorId: "conn_github_123",
  connectorType: "GITHUB",
  teamId: "team_456",
  workspaceId: "ws_789",
  organizationName: "openplane",
};

function createMockRepo(
  overrides?: Partial<GitHubRepository>
): GitHubRepository {
  return {
    id: 100,
    name: "test-repo",
    full_name: "openplane/test-repo",
    private: false,
    html_url: "https://github.com/openplane/test-repo",
    description: "A test repository",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-06-15T12:00:00Z",
    pushed_at: "2024-06-15T12:00:00Z",
    stargazers_count: 42,
    forks_count: 5,
    open_issues_count: 3,
    default_branch: "main",
    language: "TypeScript",
    topics: ["search", "enterprise"],
    visibility: "public",
    owner: {
      login: "openplane",
      id: 1,
      avatar_url: "https://avatars.githubusercontent.com/u/1",
      type: "Organization" as const,
      html_url: "https://github.com/openplane",
    },
    ...overrides,
  };
}

function createMockIssue(overrides?: Partial<GitHubIssue>): GitHubIssue {
  return {
    id: 200,
    number: 42,
    title: "Bug: Search returns stale results",
    body: "When searching for recent documents, old results appear.",
    state: "open",
    html_url: "https://github.com/openplane/test-repo/issues/42",
    created_at: "2024-03-01T10:00:00Z",
    updated_at: "2024-03-05T14:30:00Z",
    closed_at: null,
    comments: 2,
    labels: [
      { id: 1, name: "bug", color: "d73a4a", description: null },
      { id: 2, name: "search", color: "0075ca", description: null },
    ],
    assignees: [
      {
        login: "dev1",
        id: 10,
        avatar_url: "https://avatars.githubusercontent.com/u/10",
        type: "User" as const,
        html_url: "https://github.com/dev1",
      },
    ],
    user: {
      login: "reporter",
      id: 20,
      avatar_url: "https://avatars.githubusercontent.com/u/20",
      type: "User" as const,
      html_url: "https://github.com/reporter",
    },
    milestone: null,
    state_reason: null,
    ...overrides,
  };
}

describe("github transformers", () => {
  describe("transformRepository", () => {
    it("transforms basic repository to GenericDocument", async () => {
      const repo = createMockRepo();
      const doc = await transformRepository(repo, baseContext);

      expect(doc.id).toBe("conn_github_123_repository_100");
      expect(doc.connector_id).toBe("conn_github_123");
      expect(doc.team_id).toBe("team_456");
      expect(doc.document_type).toBe("repository");
      expect(doc.document_subtype).toBe("public");
      expect(doc.title).toBe("openplane/test-repo");
      expect(doc.url).toBe("https://github.com/openplane/test-repo");
      expect(doc.is_public).toBe(true);
      expect(doc.author_name).toBe("openplane");
      expect(doc.labels).toEqual(["search", "enterprise"]);
    });

    it("builds content with description, language, topics, and stats", async () => {
      const repo = createMockRepo();
      const doc = await transformRepository(repo, baseContext);

      expect(doc.content).toContain("A test repository");
      expect(doc.content).toContain("Language: TypeScript");
      expect(doc.content).toContain("Topics: search, enterprise");
      expect(doc.content).toContain("Stars: 42");
      expect(doc.content).toContain("Forks: 5");
    });

    it("marks private repos correctly", async () => {
      const repo = createMockRepo({ private: true });
      const doc = await transformRepository(repo, baseContext);

      expect(doc.document_subtype).toBe("private");
      expect(doc.is_public).toBe(false);
      expect(doc.metadata?.visibility).toBe("private");
    });

    it("sets access control with team scope", async () => {
      const doc = await transformRepository(createMockRepo(), baseContext);

      expect(doc.access_control).toEqual(["team:team_456"]);
    });

    it("generates deterministic checksum", async () => {
      const repo = createMockRepo();
      const doc1 = await transformRepository(repo, baseContext);
      const doc2 = await transformRepository(repo, baseContext);

      expect(doc1.checksum).toBe(doc2.checksum);
      expect(doc1.checksum).toBeDefined();
    });

    it("produces different checksum when content changes", async () => {
      const repo1 = createMockRepo({ description: "Version 1" });
      const repo2 = createMockRepo({ description: "Version 2" });

      const doc1 = await transformRepository(repo1, baseContext);
      const doc2 = await transformRepository(repo2, baseContext);

      expect(doc1.checksum).not.toBe(doc2.checksum);
    });

    it("includes metadata with repo stats", async () => {
      const doc = await transformRepository(createMockRepo(), baseContext);

      expect(doc.metadata?.repoId).toBe(100);
      expect(doc.metadata?.fullName).toBe("openplane/test-repo");
      expect(doc.metadata?.stargazersCount).toBe(42);
      expect(doc.metadata?.forksCount).toBe(5);
      expect(doc.metadata?.defaultBranch).toBe("main");
      expect(doc.metadata?.ownerLogin).toBe("openplane");
    });

    it("handles repo without topics", async () => {
      const repo = createMockRepo({ topics: undefined });
      const doc = await transformRepository(repo, baseContext);

      expect(doc.labels).toBeUndefined();
      expect(doc.metadata?.topics).toEqual([]);
    });
  });

  describe("transformIssue", () => {
    it("transforms issue to GenericDocument", async () => {
      const issue = createMockIssue();
      const doc = await transformIssue(issue, baseContext, {
        repoFullName: "openplane/test-repo",
        isRepoPrivate: false,
      });

      expect(doc.id).toBe("conn_github_123_issue_200");
      expect(doc.document_type).toBe("issue");
      expect(doc.document_subtype).toBe("open");
      expect(doc.title).toBe("#42: Bug: Search returns stale results");
      expect(doc.url).toBe("https://github.com/openplane/test-repo/issues/42");
      expect(doc.is_public).toBe(true);
    });

    it("marks issues from private repos as not public", async () => {
      const doc = await transformIssue(createMockIssue(), baseContext, {
        repoFullName: "openplane/test-repo",
        isRepoPrivate: true,
      });

      expect(doc.is_public).toBe(false);
    });

    it("includes labels and assignees in content", async () => {
      const issue = createMockIssue();
      const doc = await transformIssue(issue, baseContext, {
        repoFullName: "openplane/test-repo",
        isRepoPrivate: false,
      });

      expect(doc.content).toContain("Labels: bug, search");
      expect(doc.content).toContain("Assignees: dev1");
      expect(doc.content).toContain("State: open");
    });

    it("includes comments in content when provided", async () => {
      const issue = createMockIssue();
      const doc = await transformIssue(issue, baseContext, {
        repoFullName: "openplane/test-repo",
        isRepoPrivate: false,
        comments: [
          {
            id: 1,
            body: "I can reproduce this issue",
            html_url:
              "https://github.com/openplane/test-repo/issues/42#issuecomment-1",
            created_at: "2024-03-02T08:00:00Z",
            updated_at: "2024-03-02T08:00:00Z",
            user: {
              login: "dev1",
              id: 10,
              avatar_url: "https://avatars.githubusercontent.com/u/10",
              type: "User" as const,
              html_url: "https://github.com/dev1",
            },
          },
        ],
      });

      expect(doc.content).toContain("--- Comments ---");
      expect(doc.content).toContain("dev1: I can reproduce this issue");
    });

    it("extracts metadata correctly", async () => {
      const issue = createMockIssue({
        milestone: {
          id: 5,
          title: "v2.0",
          number: 1,
          state: "open" as const,
          description: null,
          due_on: null,
        },
        closed_at: "2024-03-10T00:00:00Z",
      });

      const doc = await transformIssue(issue, baseContext, {
        repoFullName: "openplane/test-repo",
        isRepoPrivate: false,
      });

      expect(doc.metadata?.number).toBe(42);
      expect(doc.metadata?.state).toBe("open");
      expect(doc.metadata?.repoFullName).toBe("openplane/test-repo");
      expect(doc.metadata?.milestoneTitle).toBe("v2.0");
      expect(doc.metadata?.closedAt).toBe("2024-03-10T00:00:00Z");
    });

    it("maps label names to doc labels", async () => {
      const issue = createMockIssue();
      const doc = await transformIssue(issue, baseContext, {
        repoFullName: "openplane/test-repo",
        isRepoPrivate: false,
      });

      expect(doc.labels).toEqual(["bug", "search"]);
    });

    it("maps assignee IDs correctly", async () => {
      const doc = await transformIssue(createMockIssue(), baseContext, {
        repoFullName: "openplane/test-repo",
        isRepoPrivate: false,
      });

      expect(doc.assignee_ids).toEqual(["10"]);
    });

    it("uses user lookup for author name when available", async () => {
      const contextWithLookup: GitHubTransformContext = {
        ...baseContext,
        userLookup: {
          get: (login: string) =>
            login === "reporter"
              ? {
                  id: 20,
                  login: "reporter",
                  name: "Reporter User",
                  avatar_url: "https://avatars.githubusercontent.com/u/20",
                  type: "User" as const,
                  html_url: "https://github.com/reporter",
                }
              : undefined,
          getName: (login: string) =>
            login === "reporter" ? "Reporter User" : undefined,
          // biome-ignore lint/nursery/noUselessUndefined: mock returns undefined
          getAvatar: (_login: string) => undefined,
          has: (login: string) => login === "reporter",
          size: 1,
        },
      };

      const doc = await transformIssue(createMockIssue(), contextWithLookup, {
        repoFullName: "openplane/test-repo",
        isRepoPrivate: false,
      });

      expect(doc.author_name).toBe("Reporter User");
    });

    it("falls back to login when user lookup has no match", async () => {
      const doc = await transformIssue(createMockIssue(), baseContext, {
        repoFullName: "openplane/test-repo",
        isRepoPrivate: false,
      });

      expect(doc.author_name).toBe("reporter");
    });
  });
});
