import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../observability/logger";

vi.mock("@opentelemetry/api", () => ({
  trace: {
    getActiveSpan: () => null,
  },
}));

vi.mock("@temporalio/workflow", () => ({
  workflowInfo: () => {
    throw new Error("Not in workflow context");
  },
}));

vi.mock("@temporalio/activity", () => ({
  activityInfo: () => {
    throw new Error("Not in activity context");
  },
}));

describe("createLogger", () => {
  it("creates a logger with default config", () => {
    const logger = createLogger();

    expect(logger.debug).toBeInstanceOf(Function);
    expect(logger.info).toBeInstanceOf(Function);
    expect(logger.warn).toBeInstanceOf(Function);
    expect(logger.error).toBeInstanceOf(Function);
    expect(logger.child).toBeInstanceOf(Function);
  });

  it("creates logger with custom component", () => {
    const logger = createLogger({ component: "test-component" });
    expect(logger).toBeDefined();
  });
});

describe("log level filtering", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  afterEach(() => {
    consoleSpy?.mockRestore();
  });

  it("filters messages below configured level", () => {
    consoleSpy = vi.spyOn(console, "debug").mockReturnValue(undefined);
    const infoSpy = vi.spyOn(console, "info").mockReturnValue(undefined);

    const logger = createLogger({ level: "info" });

    logger.debug("should not appear");
    logger.info("should appear");

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();

    infoSpy.mockRestore();
  });

  it("allows messages at configured level", () => {
    consoleSpy = vi.spyOn(console, "warn").mockReturnValue(undefined);

    const logger = createLogger({ level: "warn" });
    logger.warn("warning message");

    expect(consoleSpy).toHaveBeenCalled();
  });

  it("allows messages above configured level", () => {
    consoleSpy = vi.spyOn(console, "error").mockReturnValue(undefined);

    const logger = createLogger({ level: "warn" });
    logger.error("error message");

    expect(consoleSpy).toHaveBeenCalled();
  });

  it("debug level allows all messages", () => {
    const debugSpy = vi.spyOn(console, "debug").mockReturnValue(undefined);
    const infoSpy = vi.spyOn(console, "info").mockReturnValue(undefined);
    const warnSpy = vi.spyOn(console, "warn").mockReturnValue(undefined);
    const errorSpy = vi.spyOn(console, "error").mockReturnValue(undefined);

    const logger = createLogger({ level: "debug" });

    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    expect(debugSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    debugSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("error level filters debug, info, and warn", () => {
    const debugSpy = vi.spyOn(console, "debug").mockReturnValue(undefined);
    const infoSpy = vi.spyOn(console, "info").mockReturnValue(undefined);
    const warnSpy = vi.spyOn(console, "warn").mockReturnValue(undefined);
    consoleSpy = vi.spyOn(console, "error").mockReturnValue(undefined);

    const logger = createLogger({ level: "error" });

    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    debugSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });
});

describe("log formatting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("outputs JSON format by default", () => {
    const infoSpy = vi.spyOn(console, "info").mockReturnValue(undefined);

    const logger = createLogger({ format: "json" });
    logger.info("test message");

    const output = infoSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("test message");
    expect(parsed.timestamp).toBeDefined();
  });

  it("outputs text format when configured", () => {
    const infoSpy = vi.spyOn(console, "info").mockReturnValue(undefined);

    const logger = createLogger({ format: "text" });
    logger.info("test message");

    const output = infoSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("INFO");
    expect(output).toContain("test message");
  });

  it("includes extra data in log entry", () => {
    const infoSpy = vi.spyOn(console, "info").mockReturnValue(undefined);

    const logger = createLogger({ format: "json" });
    logger.info("with extras", { requestId: "req-123", count: 42 });

    const output = infoSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.extra.requestId).toBe("req-123");
    expect(parsed.extra.count).toBe(42);
  });
});

describe("child logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("inherits parent config", () => {
    const infoSpy = vi.spyOn(console, "info").mockReturnValue(undefined);

    const parent = createLogger({ format: "json", level: "info" });
    const child = parent.child({ executionId: "exec-1" });

    child.info("child message");

    const output = infoSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.message).toBe("child message");
    expect(parsed.context.executionId).toBe("exec-1");
  });

  it("merges additional context", () => {
    const infoSpy = vi.spyOn(console, "info").mockReturnValue(undefined);

    const parent = createLogger({ format: "json" });
    const child = parent.child({ teamId: "team-1" });
    const grandchild = child.child({ nodeId: "node-1" });

    grandchild.info("nested");

    const output = infoSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.context.teamId).toBe("team-1");
    expect(parsed.context.nodeId).toBe("node-1");
  });
});
