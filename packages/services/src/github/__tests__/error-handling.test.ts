import { describe, expect, it } from "bun:test";
import { GitHubErrorCodes } from "@openbeam/types/services/connectors/github";
import { GitHubApiError } from "../types";

describe("GitHubApiError", () => {
  describe("fromHttpResponse", () => {
    it("maps 401 to UNAUTHORIZED non-retryable", () => {
      const error = GitHubApiError.fromHttpResponse(401, {
        message: "Bad credentials",
      });

      expect(error.code).toBe(GitHubErrorCodes.UNAUTHORIZED);
      expect(error.retryable).toBe(false);
      expect(error.status).toBe(401);
      expect(error.message).toBe("Bad credentials");
    });

    it("maps 403 with rate limit message to RATE_LIMITED retryable", () => {
      const error = GitHubApiError.fromHttpResponse(403, {
        message: "API rate limit exceeded",
      });

      expect(error.code).toBe(GitHubErrorCodes.RATE_LIMITED);
      expect(error.retryable).toBe(true);
    });

    it("maps 403 with abuse message to RATE_LIMITED retryable", () => {
      const error = GitHubApiError.fromHttpResponse(403, {
        message: "You have triggered an abuse detection mechanism",
      });

      expect(error.code).toBe(GitHubErrorCodes.RATE_LIMITED);
      expect(error.retryable).toBe(true);
    });

    it("maps 403 without rate limit message to FORBIDDEN non-retryable", () => {
      const error = GitHubApiError.fromHttpResponse(403, {
        message: "Resource not accessible by integration",
      });

      expect(error.code).toBe(GitHubErrorCodes.FORBIDDEN);
      expect(error.retryable).toBe(false);
    });

    it("maps 404 to NOT_FOUND non-retryable", () => {
      const error = GitHubApiError.fromHttpResponse(404, {
        message: "Not Found",
      });

      expect(error.code).toBe(GitHubErrorCodes.NOT_FOUND);
      expect(error.retryable).toBe(false);
    });

    it("maps 422 to VALIDATION_ERROR non-retryable", () => {
      const error = GitHubApiError.fromHttpResponse(422, {
        message: "Validation Failed",
      });

      expect(error.code).toBe(GitHubErrorCodes.VALIDATION_ERROR);
      expect(error.retryable).toBe(false);
    });

    it("maps 429 to RATE_LIMITED retryable", () => {
      const error = GitHubApiError.fromHttpResponse(429, {
        message: "Too many requests",
      });

      expect(error.code).toBe(GitHubErrorCodes.RATE_LIMITED);
      expect(error.retryable).toBe(true);
    });

    it("maps 500+ to INTERNAL_ERROR retryable", () => {
      for (const status of [500, 502, 503]) {
        const error = GitHubApiError.fromHttpResponse(status, {
          message: "Server Error",
        });

        expect(error.code).toBe(GitHubErrorCodes.INTERNAL_ERROR);
        expect(error.retryable).toBe(true);
        expect(error.status).toBe(status);
      }
    });

    it("maps unknown status to UNKNOWN", () => {
      const error = GitHubApiError.fromHttpResponse(418, {
        message: "I'm a teapot",
      });

      expect(error.code).toBe("UNKNOWN");
      expect(error.status).toBe(418);
    });

    it("uses default message when body has none", () => {
      const error = GitHubApiError.fromHttpResponse(500, {});

      expect(error.message).toBe("GitHub API error: 500");
    });
  });

  describe("isAuthError", () => {
    it("returns true for UNAUTHORIZED", () => {
      expect(GitHubApiError.isAuthError(GitHubErrorCodes.UNAUTHORIZED)).toBe(
        true
      );
    });

    it("returns true for FORBIDDEN", () => {
      expect(GitHubApiError.isAuthError(GitHubErrorCodes.FORBIDDEN)).toBe(true);
    });

    it("returns false for other codes", () => {
      expect(GitHubApiError.isAuthError(GitHubErrorCodes.RATE_LIMITED)).toBe(
        false
      );
      expect(GitHubApiError.isAuthError(GitHubErrorCodes.NOT_FOUND)).toBe(
        false
      );
    });
  });

  describe("isRateLimitError", () => {
    it("returns true for RATE_LIMITED", () => {
      expect(
        GitHubApiError.isRateLimitError(GitHubErrorCodes.RATE_LIMITED)
      ).toBe(true);
    });

    it("returns true for ABUSE_LIMIT", () => {
      expect(
        GitHubApiError.isRateLimitError(GitHubErrorCodes.ABUSE_LIMIT)
      ).toBe(true);
    });

    it("returns false for other codes", () => {
      expect(
        GitHubApiError.isRateLimitError(GitHubErrorCodes.UNAUTHORIZED)
      ).toBe(false);
    });
  });

  describe("constructor", () => {
    it("sets all properties from options", () => {
      const error = new GitHubApiError({
        message: "Rate limited",
        code: GitHubErrorCodes.RATE_LIMITED,
        retryable: true,
        retryAfter: 60,
        status: 429,
      });

      expect(error.name).toBe("GitHubApiError");
      expect(error.message).toBe("Rate limited");
      expect(error.code).toBe(GitHubErrorCodes.RATE_LIMITED);
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(60);
      expect(error.status).toBe(429);
    });

    it("defaults retryable to false", () => {
      const error = new GitHubApiError({
        message: "Error",
        code: "TEST",
      });

      expect(error.retryable).toBe(false);
    });

    it("is instanceof Error", () => {
      const error = new GitHubApiError({
        message: "Error",
        code: "TEST",
      });

      expect(error).toBeInstanceOf(Error);
    });
  });
});
