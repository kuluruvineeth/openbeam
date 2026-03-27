import { describe, expect, it } from "bun:test";
import {
  buildUri,
  generateEntryId,
  getParentUri,
  getScopeFromUri,
  isDescendant,
  parseUri,
} from "../uri";

const HEX_32 = /^[a-f0-9]{32}$/;

describe("parseUri", () => {
  it("parses a user-scoped URI", () => {
    const result = parseUri(
      "openbeam://user/team_abc/user_123/memories/preferences"
    );
    expect(result.scope).toBe("user");
    expect(result.teamId).toBe("team_abc");
    expect(result.segments).toEqual(["user_123", "memories", "preferences"]);
  });

  it("parses an agent-scoped URI", () => {
    const result = parseUri("openbeam://agent/team_abc/agent_1/skills");
    expect(result.scope).toBe("agent");
    expect(result.teamId).toBe("team_abc");
    expect(result.segments).toEqual(["agent_1", "skills"]);
  });

  it("parses a resources-scoped URI", () => {
    const result = parseUri("openbeam://resources/team_abc/connectors/slack");
    expect(result.scope).toBe("resources");
    expect(result.teamId).toBe("team_abc");
    expect(result.segments).toEqual(["connectors", "slack"]);
  });

  it("parses a tools-scoped URI", () => {
    const result = parseUri("openbeam://tools/team_abc/definitions");
    expect(result.scope).toBe("tools");
    expect(result.teamId).toBe("team_abc");
    expect(result.segments).toEqual(["definitions"]);
  });

  it("parses a session-scoped URI", () => {
    const result = parseUri("openbeam://session/team_abc/user_1/sess_1");
    expect(result.scope).toBe("session");
    expect(result.teamId).toBe("team_abc");
    expect(result.segments).toEqual(["user_1", "sess_1"]);
  });

  it("parses a root-level URI with only scope and teamId", () => {
    const result = parseUri("openbeam://user/team_abc");
    expect(result.scope).toBe("user");
    expect(result.teamId).toBe("team_abc");
    expect(result.segments).toEqual([]);
  });

  it("strips trailing slash", () => {
    const result = parseUri("openbeam://user/team_abc/memories/");
    expect(result.segments).toEqual(["memories"]);
  });

  it("throws on missing openbeam:// prefix", () => {
    expect(() => parseUri("http://user/team_abc")).toThrow(
      "must start with openbeam://"
    );
  });

  it("throws on empty string", () => {
    expect(() => parseUri("")).toThrow("must start with openbeam://");
  });

  it("throws on URI with only scope (no teamId)", () => {
    expect(() => parseUri("openbeam://user")).toThrow(
      "must have at least scope and teamId"
    );
  });

  it("throws on invalid scope", () => {
    expect(() => parseUri("openbeam://invalid/team_abc")).toThrow(
      "Invalid context URI scope"
    );
  });
});

describe("buildUri", () => {
  it("builds a URI with segments", () => {
    const uri = buildUri("user", "team_abc", "user_123", "memories");
    expect(uri).toBe("openbeam://user/team_abc/user_123/memories");
  });

  it("builds a root-level URI", () => {
    const uri = buildUri("resources", "team_abc");
    expect(uri).toBe("openbeam://resources/team_abc");
  });

  it("builds a URI with many segments", () => {
    const uri = buildUri("agent", "t1", "a1", "skills", "search");
    expect(uri).toBe("openbeam://agent/t1/a1/skills/search");
  });
});

describe("parseUri / buildUri roundtrip", () => {
  it("roundtrips correctly", () => {
    const original = "openbeam://user/team_abc/user_123/memories/preferences";
    const parsed = parseUri(original);
    const rebuilt = buildUri(parsed.scope, parsed.teamId, ...parsed.segments);
    expect(rebuilt).toBe(original);
  });

  it("roundtrips root URI", () => {
    const original = "openbeam://tools/team_abc";
    const parsed = parseUri(original);
    const rebuilt = buildUri(parsed.scope, parsed.teamId, ...parsed.segments);
    expect(rebuilt).toBe(original);
  });
});

describe("getParentUri", () => {
  it("returns parent by stripping last segment", () => {
    const parent = getParentUri(
      "openbeam://user/team_abc/memories/preferences"
    );
    expect(parent).toBe("openbeam://user/team_abc/memories");
  });

  it("returns scope root as parent of first segment", () => {
    const parent = getParentUri("openbeam://user/team_abc/memories");
    expect(parent).toBe("openbeam://user/team_abc");
  });

  it("returns null for root URI (scope + teamId only)", () => {
    const parent = getParentUri("openbeam://user/team_abc");
    expect(parent).toBeNull();
  });

  it("handles trailing slash", () => {
    const parent = getParentUri(
      "openbeam://user/team_abc/memories/preferences/"
    );
    expect(parent).toBe("openbeam://user/team_abc/memories");
  });
});

describe("isDescendant", () => {
  it("returns true for a direct child", () => {
    expect(
      isDescendant(
        "openbeam://user/team_abc/memories",
        "openbeam://user/team_abc/memories/preferences"
      )
    ).toBe(true);
  });

  it("returns true for a deeply nested descendant", () => {
    expect(
      isDescendant(
        "openbeam://user/team_abc",
        "openbeam://user/team_abc/memories/preferences/coding-style"
      )
    ).toBe(true);
  });

  it("returns false for the same URI", () => {
    expect(
      isDescendant(
        "openbeam://user/team_abc/memories",
        "openbeam://user/team_abc/memories"
      )
    ).toBe(false);
  });

  it("returns false for a sibling", () => {
    expect(
      isDescendant(
        "openbeam://user/team_abc/memories",
        "openbeam://user/team_abc/skills"
      )
    ).toBe(false);
  });

  it("returns false for a parent", () => {
    expect(
      isDescendant(
        "openbeam://user/team_abc/memories/preferences",
        "openbeam://user/team_abc/memories"
      )
    ).toBe(false);
  });

  it("returns false when prefix matches but is not a path boundary", () => {
    expect(
      isDescendant(
        "openbeam://user/team_abc/mem",
        "openbeam://user/team_abc/memories"
      )
    ).toBe(false);
  });
});

describe("getScopeFromUri", () => {
  it("extracts user scope", () => {
    expect(getScopeFromUri("openbeam://user/team_abc/u1")).toBe("user");
  });

  it("extracts resources scope", () => {
    expect(getScopeFromUri("openbeam://resources/team_abc")).toBe("resources");
  });
});

describe("generateEntryId", () => {
  it("returns deterministic output for same input", () => {
    const id1 = generateEntryId(
      "team_abc",
      "openbeam://user/team_abc/memories"
    );
    const id2 = generateEntryId(
      "team_abc",
      "openbeam://user/team_abc/memories"
    );
    expect(id1).toBe(id2);
  });

  it("returns different output for different URIs", () => {
    const id1 = generateEntryId(
      "team_abc",
      "openbeam://user/team_abc/memories"
    );
    const id2 = generateEntryId("team_abc", "openbeam://user/team_abc/skills");
    expect(id1).not.toBe(id2);
  });

  it("returns different output for different teams", () => {
    const id1 = generateEntryId("team_a", "openbeam://user/team_a/memories");
    const id2 = generateEntryId("team_b", "openbeam://user/team_b/memories");
    expect(id1).not.toBe(id2);
  });

  it("returns a 32-character hex string", () => {
    const id = generateEntryId("team_abc", "openbeam://user/team_abc/memories");
    expect(id).toMatch(HEX_32);
  });
});
