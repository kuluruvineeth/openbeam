import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type LoggerLike = {
  child(bindings: Record<string, unknown>): LoggerLike;
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  info(...args: any[]): void;
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  warn(...args: any[]): void;
};

const SERVER_ID_FILENAME = "server-id";

function getLogger(logger: LoggerLike | undefined): LoggerLike | undefined {
  return logger?.child({ module: "server-id" });
}

function getServerIdPath(openplaneHome: string): string {
  return path.join(openplaneHome, SERVER_ID_FILENAME);
}

function generateServerId(): string {
  // 9 bytes -> 12 base64url chars; keep it short + URL-safe.
  const rand = randomBytes(9).toString("base64url");
  return `srv_${rand}`;
}

/**
 * Stable daemon identifier scoped to a given $OPENPLANE_HOME.
 *
 * - Persisted to `$OPENPLANE_HOME/server-id`
 * - Can be overridden via `OPENPLANE_SERVER_ID` (useful for tests)
 */
export function getOrCreateServerId(
  openplaneHome: string,
  options?: { env?: NodeJS.ProcessEnv; logger?: LoggerLike }
): string {
  const env = options?.env ?? process.env;
  const log = getLogger(options?.logger);
  const serverIdPath = getServerIdPath(openplaneHome);

  const envOverride =
    typeof env.OPENPLANE_SERVER_ID === "string" &&
    env.OPENPLANE_SERVER_ID.trim().length > 0
      ? env.OPENPLANE_SERVER_ID.trim()
      : null;

  if (envOverride) {
    // Persist the override for consistent identity across restarts.
    if (!existsSync(serverIdPath)) {
      try {
        writeFileSync(serverIdPath, `${envOverride}\n`, "utf8");
        log?.info(
          { serverId: envOverride },
          "Persisted OPENPLANE_SERVER_ID override"
        );
      } catch (error) {
        log?.warn({ error }, "Failed to persist OPENPLANE_SERVER_ID override");
      }
    }
    return envOverride;
  }

  if (existsSync(serverIdPath)) {
    try {
      const raw = readFileSync(serverIdPath, "utf8");
      const parsed = raw.trim();
      if (parsed.length > 0) {
        return parsed;
      }
    } catch (error) {
      log?.warn({ error }, "Failed to read server-id file, regenerating");
    }
  }

  const created = generateServerId();
  try {
    writeFileSync(serverIdPath, `${created}\n`, "utf8");
  } catch (error) {
    log?.warn(
      { error },
      "Failed to persist serverId (continuing with in-memory id)"
    );
  }
  return created;
}
