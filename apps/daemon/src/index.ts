import { createOpenPlaneDaemon } from "./bootstrap.js";
import { loadConfig } from "./config.js";
import { createRootLogger } from "./logger.js";
import { resolveOpenPlaneHome } from "./openplane-home.js";
import { loadPersistedConfig } from "./persisted-config.js";
import { PidLockError } from "./pid-lock.js";

async function main() {
  let openplaneHome: string;
  let logger: ReturnType<typeof createRootLogger>;
  let config: ReturnType<typeof loadConfig>;

  try {
    openplaneHome = resolveOpenPlaneHome();
    const persistedConfig = loadPersistedConfig(openplaneHome);
    logger = createRootLogger(persistedConfig);
    config = loadConfig(openplaneHome);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }

  if (process.argv.includes("--no-relay")) {
    config.relayEnabled = false;
  }
  if (process.argv.includes("--no-mcp")) {
    config.mcpEnabled = false;
  }

  // biome-ignore lint/suspicious/noEvolvingTypes: type narrows through function
  let daemon;
  try {
    daemon = await createOpenPlaneDaemon(config, logger);
  } catch (err) {
    if (err instanceof PidLockError) {
      logger.error({ pid: err.existingLock?.pid }, err.message);
      process.exit(1);
    }
    throw err;
  }

  try {
    await daemon.start();
  } catch (err) {
    if (err instanceof PidLockError) {
      logger.error({ pid: err.existingLock?.pid }, err.message);
      process.exit(1);
    }
    throw err;
  }

  let shuttingDown = false;
  const handleShutdown = async (signal: string) => {
    if (shuttingDown) {
      logger.info("Forcing exit...");
      process.exit(1);
    }
    shuttingDown = true;
    logger.info(
      `${signal} received, shutting down gracefully... (press Ctrl+C again to force exit)`
    );

    const forceExit = setTimeout(() => {
      logger.warn("Forcing shutdown - HTTP server didn't close in time");
      process.exit(1);
    }, 10_000);

    try {
      await daemon.stop();
      clearTimeout(forceExit);
      logger.info("Server closed");
      process.exit(0);
    } catch (err) {
      clearTimeout(forceExit);
      logger.error({ err }, "Shutdown failed");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
}

main().catch((err) => {
  if (process.env.OPENPLANE_DEBUG === "1") {
    process.stderr.write(
      `${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`
    );
  } else {
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}\n`
    );
  }
  process.exit(1);
});
