import { describe, expect, it } from "bun:test";
import type { DestinationStream } from "pino";
import { runWithRequestContext } from "../context";
import { createLogger, withLogContext } from "../logger";

function createBufferingDestination() {
  const lines: string[] = [];

  const destination: DestinationStream = {
    write(message: string) {
      lines.push(message);
    },
  };

  return { destination, lines };
}

function parseLastLog(lines: string[]): Record<string, unknown> {
  const logLines = lines.join("").trim().split("\n").filter(Boolean);
  const lastLine = logLines.at(-1);

  if (!lastLine) {
    throw new Error("No log line captured");
  }

  return JSON.parse(lastLine) as Record<string, unknown>;
}

describe("createLogger", () => {
  it("binds request context fields", () => {
    const { destination, lines } = createBufferingDestination();
    const logger = createLogger({
      service: "openbeam-observability-test",
      env: "production",
      version: "test",
      level: "info",
      pretty: false,
      destination,
    });

    runWithRequestContext(
      {
        requestId: "req-logger-1",
        method: "GET",
        path: "/api/v1/test",
        route: "/api/v1/test",
        teamId: "team-1",
        userId: "user-1",
      },
      () => {
        logger.info({ status_code: 200 }, "request_completed");
      }
    );

    const log = parseLastLog(lines);

    expect(log.service).toBe("openbeam-observability-test");
    expect(log.request_id).toBe("req-logger-1");
    expect(log.route).toBe("/api/v1/test");
    expect(log.status_code).toBe(200);
  });

  it("redacts sensitive payload fields", () => {
    const { destination, lines } = createBufferingDestination();
    const logger = createLogger({
      service: "openbeam-observability-test",
      env: "production",
      version: "test",
      level: "info",
      pretty: false,
      destination,
    });

    logger.info(
      {
        token: "super-secret",
        nested: {
          password: "super-secret-password",
        },
      },
      "redaction_check"
    );

    const log = parseLastLog(lines);

    expect(log.token).toBe("[REDACTED]");
    expect((log.nested as { password?: string } | undefined)?.password).toBe(
      "[REDACTED]"
    );
  });

  it("applies context with withLogContext helper", () => {
    const { destination, lines } = createBufferingDestination();
    const logger = createLogger({
      service: "openbeam-observability-test",
      env: "production",
      version: "test",
      level: "info",
      pretty: false,
      destination,
    });

    withLogContext(
      {
        requestId: "req-log-context-1",
        route: "/api/v1/context",
      },
      () => {
        logger.info("with_context");
      }
    );

    const log = parseLastLog(lines);

    expect(log.request_id).toBe("req-log-context-1");
    expect(log.route).toBe("/api/v1/context");
  });
});
