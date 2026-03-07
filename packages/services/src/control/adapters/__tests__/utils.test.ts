import { describe, expect, it } from "bun:test";
import {
  appendWithCap,
  asBoolean,
  asNumber,
  asString,
  buildAgentEnv,
  parseJsonSafe,
  redactEnvForLogs,
} from "../utils";

describe("redactEnvForLogs", () => {
  it("redacts sensitive env vars", () => {
    const env = {
      NODE_ENV: "production",
      API_KEY: "sk-secret",
      DATABASE_TOKEN: "tok_abc",
      OPENAI_SECRET: "sk-xyz",
      DEBUG: "true",
      AUTH_HEADER: "Bearer token",
      PASSWORD: "hunter2",
      CREDENTIAL_FILE: "/path/to/cred",
    };
    const redacted = redactEnvForLogs(env);

    expect(redacted.NODE_ENV).toBe("production");
    expect(redacted.DEBUG).toBe("true");
    expect(redacted.API_KEY).toBe("***");
    expect(redacted.DATABASE_TOKEN).toBe("***");
    expect(redacted.OPENAI_SECRET).toBe("***");
    expect(redacted.AUTH_HEADER).toBe("***");
    expect(redacted.PASSWORD).toBe("***");
    expect(redacted.CREDENTIAL_FILE).toBe("***");
  });

  it("preserves non-sensitive vars", () => {
    const env = { PORT: "3000", HOST: "localhost" };
    const redacted = redactEnvForLogs(env);
    expect(redacted.PORT).toBe("3000");
    expect(redacted.HOST).toBe("localhost");
  });
});

describe("buildAgentEnv", () => {
  it("sets required env vars", () => {
    const env = buildAgentEnv({
      agentId: "agent_01",
      teamId: "team_01",
      runId: "run_01",
    });
    expect(env.OPENBEAM_AGENT_ID).toBe("agent_01");
    expect(env.OPENBEAM_TEAM_ID).toBe("team_01");
    expect(env.OPENBEAM_RUN_ID).toBe("run_01");
  });

  it("includes optional vars when provided", () => {
    const env = buildAgentEnv({
      agentId: "a",
      teamId: "t",
      runId: "r",
      apiUrl: "https://api.example.com",
      taskKey: "ISSUE-42",
      wakeReason: "scheduled",
    });
    expect(env.OPENBEAM_API_URL).toBe("https://api.example.com");
    expect(env.OPENBEAM_TASK_KEY).toBe("ISSUE-42");
    expect(env.OPENBEAM_WAKE_REASON).toBe("scheduled");
  });

  it("merges extra env vars", () => {
    const env = buildAgentEnv({
      agentId: "a",
      teamId: "t",
      runId: "r",
      extra: { CUSTOM_VAR: "custom_value" },
    });
    expect(env.CUSTOM_VAR).toBe("custom_value");
  });

  it("omits optional vars when not provided", () => {
    const env = buildAgentEnv({
      agentId: "a",
      teamId: "t",
      runId: "r",
    });
    expect(env.OPENBEAM_API_URL).toBeUndefined();
    expect(env.OPENBEAM_TASK_KEY).toBeUndefined();
    expect(env.OPENBEAM_WAKE_REASON).toBeUndefined();
  });
});

describe("appendWithCap", () => {
  it("appends within capacity", () => {
    expect(appendWithCap("hello", " world", 20)).toBe("hello world");
  });

  it("truncates addition at capacity", () => {
    expect(appendWithCap("hello", " world!", 10)).toBe("hello worl");
  });

  it("returns current when already at cap", () => {
    expect(appendWithCap("12345", "extra", 5)).toBe("12345");
  });

  it("handles empty strings", () => {
    expect(appendWithCap("", "hello", 10)).toBe("hello");
    expect(appendWithCap("hello", "", 10)).toBe("hello");
  });
});

describe("parseJsonSafe", () => {
  it("parses valid JSON", () => {
    expect(parseJsonSafe('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonSafe("[1,2,3]")).toEqual([1, 2, 3]);
    expect(parseJsonSafe('"hello"')).toBe("hello");
  });

  it("returns null for invalid JSON", () => {
    expect(parseJsonSafe("not json")).toBeNull();
    expect(parseJsonSafe("{broken")).toBeNull();
    expect(parseJsonSafe("")).toBeNull();
  });
});

describe("asString", () => {
  it("returns string for string input", () => {
    expect(asString("hello")).toBe("hello");
  });

  it("returns fallback for non-string", () => {
    expect(asString(42)).toBe("");
    expect(asString(null)).toBe("");
    expect(asString(undefined)).toBe("");
    expect(asString(42, "default")).toBe("default");
  });
});

describe("asNumber", () => {
  it("returns number for finite number input", () => {
    expect(asNumber(42)).toBe(42);
    expect(asNumber(0)).toBe(0);
    expect(asNumber(-1)).toBe(-1);
  });

  it("returns fallback for non-number", () => {
    expect(asNumber("42")).toBe(0);
    expect(asNumber(null)).toBe(0);
    expect(asNumber(Number.NaN)).toBe(0);
    expect(asNumber(Number.POSITIVE_INFINITY)).toBe(0);
    expect(asNumber("42", 99)).toBe(99);
  });
});

describe("asBoolean", () => {
  it("returns boolean for boolean input", () => {
    expect(asBoolean(true)).toBe(true);
    expect(asBoolean(false)).toBe(false);
  });

  it("returns fallback for non-boolean", () => {
    expect(asBoolean(1)).toBe(false);
    expect(asBoolean("true")).toBe(false);
    expect(asBoolean(null)).toBe(false);
    expect(asBoolean(1, true)).toBe(true);
  });
});
