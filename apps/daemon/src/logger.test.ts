import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveLogConfig } from "./logger";
import type { PersistedConfig } from "./persisted-config";

describe("resolveLogConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.OPENPLANE_LOG = undefined;
    process.env.OPENPLANE_LOG_FORMAT = undefined;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns defaults when no config or env vars", () => {
    const result = resolveLogConfig(undefined);
    expect(result).toEqual({ level: "debug", format: "pretty" });
  });

  it("uses config.json values over defaults", () => {
    const config: PersistedConfig = {
      log: {
        level: "debug",
        format: "json",
      },
    };
    const result = resolveLogConfig(config);
    expect(result).toEqual({ level: "debug", format: "json" });
  });

  it("uses env OPENPLANE_LOG over config.json level", () => {
    process.env.OPENPLANE_LOG = "warn";
    const config: PersistedConfig = {
      log: {
        level: "debug",
        format: "json",
      },
    };
    const result = resolveLogConfig(config);
    expect(result).toEqual({ level: "warn", format: "json" });
  });

  it("uses env OPENPLANE_LOG_FORMAT over config.json format", () => {
    process.env.OPENPLANE_LOG_FORMAT = "pretty";
    const config: PersistedConfig = {
      log: {
        level: "debug",
        format: "json",
      },
    };
    const result = resolveLogConfig(config);
    expect(result).toEqual({ level: "debug", format: "pretty" });
  });

  it("env vars override both config.json and defaults", () => {
    process.env.OPENPLANE_LOG = "error";
    process.env.OPENPLANE_LOG_FORMAT = "json";
    const config: PersistedConfig = {
      log: {
        level: "info",
        format: "pretty",
      },
    };
    const result = resolveLogConfig(config);
    expect(result).toEqual({ level: "error", format: "json" });
  });

  it("handles partial config - level only", () => {
    const config: PersistedConfig = {
      log: {
        level: "warn",
      },
    };
    const result = resolveLogConfig(config);
    expect(result).toEqual({ level: "warn", format: "pretty" });
  });

  it("handles partial config - format only", () => {
    const config: PersistedConfig = {
      log: {
        format: "json",
      },
    };
    const result = resolveLogConfig(config);
    expect(result).toEqual({ level: "debug", format: "json" });
  });

  it("handles empty log object in config", () => {
    const config: PersistedConfig = {
      log: {},
    };
    const result = resolveLogConfig(config);
    expect(result).toEqual({ level: "debug", format: "pretty" });
  });

  it("supports all log levels", () => {
    const levels: Array<
      "trace" | "debug" | "info" | "warn" | "error" | "fatal"
    > = ["trace", "debug", "info", "warn", "error", "fatal"];

    for (const level of levels) {
      process.env.OPENPLANE_LOG = level;
      const result = resolveLogConfig(undefined);
      expect(result.level).toBe(level);
    }
  });
});
