import { describe, expect, it } from "bun:test";
import crypto from "node:crypto";
import type { GitHubWebhookPayload } from "@openplane/types/services/connectors/github";
import {
  type GitHubWebhookRequest,
  isGitHubTimestampValid,
  parseGitHubWebhookPayload,
  resolveGitHubWebhookChanges,
  verifyGitHubWebhookSignature,
} from "../push/notification-handler";

const WEBHOOK_SECRET = "test-webhook-secret-123";

function createSignedRequest(
  body: string,
  secret = WEBHOOK_SECRET
): GitHubWebhookRequest {
  const signature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")}`;

  return {
    headers: {
      "x-hub-signature-256": signature,
      "x-github-delivery": "delivery-001",
      "x-github-event": "issues",
    },
    body,
  };
}

const MOCK_REPO = {
  id: 1,
  name: "test",
  full_name: "openplane/test",
  description: null,
  language: null,
  stargazers_count: 0,
  forks_count: 0,
  open_issues_count: 0,
  private: false,
  default_branch: "main",
  html_url: "https://github.com/openplane/test",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  pushed_at: "2024-01-01T00:00:00Z",
  owner: {
    id: 1,
    login: "openplane",
    avatar_url: "https://avatars.githubusercontent.com/u/1",
    type: "Organization",
    html_url: "https://github.com/openplane",
  },
};

describe("github webhook handler", () => {
  describe("verifyGitHubWebhookSignature", () => {
    it("accepts valid signature", () => {
      const body = JSON.stringify({ action: "opened" });
      const request = createSignedRequest(body);
      const result = verifyGitHubWebhookSignature(request, WEBHOOK_SECRET);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("rejects missing signature header", () => {
      const request: GitHubWebhookRequest = {
        headers: {},
        body: "{}",
      };
      const result = verifyGitHubWebhookSignature(request, WEBHOOK_SECRET);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Missing X-Hub-Signature-256 header");
    });

    it("rejects invalid signature", () => {
      const request: GitHubWebhookRequest = {
        headers: {
          "x-hub-signature-256":
            "sha256=0000000000000000000000000000000000000000000000000000000000000000",
        },
        body: JSON.stringify({ action: "opened" }),
      };
      const result = verifyGitHubWebhookSignature(request, WEBHOOK_SECRET);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid signature");
    });

    it("rejects signature with wrong secret", () => {
      const body = JSON.stringify({ action: "opened" });
      const request = createSignedRequest(body, "wrong-secret");
      const result = verifyGitHubWebhookSignature(request, WEBHOOK_SECRET);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid signature");
    });

    it("rejects tampered body", () => {
      const body = JSON.stringify({ action: "opened" });
      const request = createSignedRequest(body);
      request.body = JSON.stringify({ action: "closed" });

      const result = verifyGitHubWebhookSignature(request, WEBHOOK_SECRET);

      expect(result.valid).toBe(false);
    });
  });

  describe("parseGitHubWebhookPayload", () => {
    it("parses valid payload with full repository", () => {
      const body = JSON.stringify({
        action: "opened",
        repository: MOCK_REPO,
      });

      const payload = parseGitHubWebhookPayload(body);
      expect(payload.action).toBe("opened");
      expect(payload.repository?.full_name).toBe("openplane/test");
    });

    it("parses payload without repository", () => {
      const body = JSON.stringify({ action: "ping" });
      const payload = parseGitHubWebhookPayload(body);
      expect(payload.action).toBe("ping");
      expect(payload.repository).toBeUndefined();
    });

    it("throws on invalid JSON", () => {
      expect(() => parseGitHubWebhookPayload("not-json")).toThrow();
    });
  });

  describe("isGitHubTimestampValid", () => {
    it("accepts recent timestamp", () => {
      expect(isGitHubTimestampValid(Date.now())).toBe(true);
    });

    it("accepts timestamp within 5 minute window", () => {
      const fourMinutesAgo = Date.now() - 4 * 60 * 1000;
      expect(isGitHubTimestampValid(fourMinutesAgo)).toBe(true);
    });

    it("rejects timestamp older than 5 minutes", () => {
      const sixMinutesAgo = Date.now() - 6 * 60 * 1000;
      expect(isGitHubTimestampValid(sixMinutesAgo)).toBe(false);
    });

    it("rejects future timestamp", () => {
      const futureTime = Date.now() + 60_000;
      expect(isGitHubTimestampValid(futureTime)).toBe(false);
    });
  });

  describe("resolveGitHubWebhookChanges", () => {
    it("resolves issue opened event", () => {
      const payload = {
        action: "opened",
        issue: { id: 42 },
        repository: { full_name: "openplane/test" },
      } as unknown as GitHubWebhookPayload;
      const result = resolveGitHubWebhookChanges("issues", payload);

      expect(result.eventType).toBe("issues");
      expect(result.action).toBe("opened");
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toEqual({
        action: "upsert",
        entityType: "issue",
        entityId: 42,
        repoFullName: "openplane/test",
      });
    });

    it("resolves issue closed as delete", () => {
      const payload = {
        action: "closed",
        issue: { id: 42 },
        repository: { full_name: "openplane/test" },
      } as unknown as GitHubWebhookPayload;
      const result = resolveGitHubWebhookChanges("issues", payload);

      expect(result.changes[0]?.action).toBe("delete");
    });

    it("resolves pull request event", () => {
      const payload = {
        action: "opened",
        pull_request: { id: 100 },
        repository: { full_name: "openplane/test" },
      } as unknown as GitHubWebhookPayload;
      const result = resolveGitHubWebhookChanges("pull_request", payload);

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toEqual({
        action: "upsert",
        entityType: "pull_request",
        entityId: 100,
        repoFullName: "openplane/test",
      });
    });

    it("resolves push event with head commit", () => {
      const payload = {
        action: "",
        head_commit: { id: "abc123" },
        repository: { full_name: "openplane/test" },
      } as unknown as GitHubWebhookPayload;
      const result = resolveGitHubWebhookChanges("push", payload);

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]?.entityType).toBe("commit");
      expect(result.changes[0]?.entityId).toBe("abc123");
    });

    it("resolves discussion event", () => {
      const payload = {
        action: "created",
        discussion: { node_id: "D_kwDOABC" },
        repository: { full_name: "openplane/test" },
      } as unknown as GitHubWebhookPayload;
      const result = resolveGitHubWebhookChanges("discussion", payload);

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]?.entityType).toBe("discussion");
      expect(result.changes[0]?.entityId).toBe("D_kwDOABC");
    });

    it("returns empty changes for unhandled event types", () => {
      const payload = {
        action: "created",
        repository: { full_name: "openplane/test" },
      } as unknown as GitHubWebhookPayload;
      const result = resolveGitHubWebhookChanges("star", payload);

      expect(result.changes).toHaveLength(0);
    });

    it("returns empty changes when entity ID is missing", () => {
      const payload = {
        action: "opened",
        repository: { full_name: "openplane/test" },
      } as unknown as GitHubWebhookPayload;
      const result = resolveGitHubWebhookChanges("issues", payload);

      expect(result.changes).toHaveLength(0);
    });

    it("resolves deleted event as delete action", () => {
      const payload = {
        action: "deleted",
        issue: { id: 42 },
        repository: { full_name: "openplane/test" },
      } as unknown as GitHubWebhookPayload;
      const result = resolveGitHubWebhookChanges("issues", payload);

      expect(result.changes[0]?.action).toBe("delete");
    });
  });
});
