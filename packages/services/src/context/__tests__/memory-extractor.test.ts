import { describe, expect, it } from "bun:test";
import {
  buildMemoryUri,
  formatMessagesForExtraction,
  generateSlug,
  MEMORY_EXTRACTION_SYSTEM_PROMPT,
} from "../memory-extractor";

const NON_URL_SAFE_PATTERN = /[^a-z0-9-]/;

describe("formatMessagesForExtraction", () => {
  it("formats messages with role prefix", () => {
    const messages = [
      {
        id: "1",
        sessionId: "s1",
        role: "user" as const,
        content: "Hello",
        parts: null,
        tokenCount: 1,
        createdAt: new Date(),
      },
      {
        id: "2",
        sessionId: "s1",
        role: "assistant" as const,
        content: "Hi there",
        parts: null,
        tokenCount: 2,
        createdAt: new Date(),
      },
    ];
    const result = formatMessagesForExtraction(messages);
    expect(result).toBe("[user]: Hello\n\n[assistant]: Hi there");
  });

  it("returns empty string for empty array", () => {
    expect(formatMessagesForExtraction([])).toBe("");
  });
});

describe("buildMemoryUri", () => {
  it("creates user-scope URI", () => {
    const uri = buildMemoryUri({
      scope: "user",
      teamId: "team1",
      ownerId: "user1",
      category: "preferences",
      slug: "coding-style",
    });
    expect(uri).toBe(
      "openbeam://user/team1/user1/memories/preferences/coding-style"
    );
  });

  it("creates agent-scope URI", () => {
    const uri = buildMemoryUri({
      scope: "agent",
      teamId: "team1",
      ownerId: "agent1",
      category: "cases",
      slug: "auth-fix",
    });
    expect(uri).toBe("openbeam://agent/team1/agent1/memories/cases/auth-fix");
  });
});

describe("generateSlug", () => {
  it("produces URL-safe output", () => {
    const slug = generateSlug("Hello World! This is a test.");
    expect(slug).not.toMatch(NON_URL_SAFE_PATTERN);
  });

  it("is deterministic", () => {
    const a = generateSlug("same content");
    const b = generateSlug("same content");
    expect(a).toBe(b);
  });

  it("handles empty string", () => {
    const slug = generateSlug("");
    expect(slug.length).toBeGreaterThan(0);
  });

  it("handles special characters", () => {
    const slug = generateSlug("Hello @#$% World!!! 🎉");
    expect(slug).not.toMatch(NON_URL_SAFE_PATTERN);
  });

  it("truncates long content", () => {
    const long = "a".repeat(200);
    const slug = generateSlug(long);
    expect(slug.length).toBeLessThanOrEqual(59);
  });

  it("produces different slugs for different content", () => {
    const a = generateSlug("first content");
    const b = generateSlug("second content");
    expect(a).not.toBe(b);
  });
});

describe("MEMORY_EXTRACTION_SYSTEM_PROMPT", () => {
  it("contains all 8 memory categories", () => {
    expect(MEMORY_EXTRACTION_SYSTEM_PROMPT).toContain("profile");
    expect(MEMORY_EXTRACTION_SYSTEM_PROMPT).toContain("preferences");
    expect(MEMORY_EXTRACTION_SYSTEM_PROMPT).toContain("entities");
    expect(MEMORY_EXTRACTION_SYSTEM_PROMPT).toContain("events");
    expect(MEMORY_EXTRACTION_SYSTEM_PROMPT).toContain("cases");
    expect(MEMORY_EXTRACTION_SYSTEM_PROMPT).toContain("patterns");
    expect(MEMORY_EXTRACTION_SYSTEM_PROMPT).toContain("tools");
    expect(MEMORY_EXTRACTION_SYSTEM_PROMPT).toContain("skills");
  });
});
