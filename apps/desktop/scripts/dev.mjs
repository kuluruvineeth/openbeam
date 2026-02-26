import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DESKTOP_DIR = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(DESKTOP_DIR, "..", "..");

const MOBILE_SERVER_URL = "http://localhost:8081";
const MOBILE_BUNDLE_URL =
  "http://127.0.0.1:8081/apps/mobile/index.ts.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable";

const MOBILE_READY_TIMEOUT_MS = 180_000;
const MOBILE_READY_POLL_MS = 1500;
const QUICK_REQUEST_TIMEOUT_MS = 2000;
const READY_REQUEST_TIMEOUT_MS = 10_000;

const BUNDLE_WARMUP_TOTAL_TIMEOUT_MS = 120_000;
const BUNDLE_WARMUP_RETRY_MS = 2000;
const CURL_MAX_TIME_SECONDS = 600;

const SHUTDOWN_TIMEOUT_MS = 5000;

let mobileProcess = null;
let tauriProcess = null;
let startedMobileServer = false;
let shuttingDown = false;

function log(message) {
  console.log(`[desktop-dev] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkMobileServerReady(requestTimeoutMs) {
  try {
    const response = await fetchWithTimeout(
      MOBILE_SERVER_URL,
      requestTimeoutMs
    );
    if (!response.ok) {
      return { ready: false, reason: `HTTP ${response.status}` };
    }

    return { ready: true, reason: "server is reachable" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ready: false, reason };
  }
}

function startMobileWebServer() {
  startedMobileServer = true;
  log("Starting mobile web server on :8081");
  return spawn("bun", ["run", "-F", "mobile", "web"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: process.env,
  });
}

async function waitForMobileReady() {
  const initial = await checkMobileServerReady(QUICK_REQUEST_TIMEOUT_MS);
  if (initial.ready) {
    log("Reusing existing healthy mobile web server on :8081");
    return;
  }

  mobileProcess = startMobileWebServer();
  mobileProcess.once("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }
    const suffix = signal ? `signal ${signal}` : `code ${code ?? 1}`;
    console.error(
      `[desktop-dev] Mobile web server exited unexpectedly (${suffix})`
    );
    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void shutdown(1);
  });

  const startedAt = Date.now();
  let lastReason = initial.reason;
  let _attempts = 0;

  while (Date.now() - startedAt < MOBILE_READY_TIMEOUT_MS) {
    _attempts += 1;
    const status = await checkMobileServerReady(READY_REQUEST_TIMEOUT_MS);
    if (status.ready) {
      log("Mobile web server is ready");
      return;
    }

    lastReason = status.reason;
    log(`Waiting for mobile web server (${lastReason})`);
    await sleep(MOBILE_READY_POLL_MS);
  }

  throw new Error(
    `Timed out waiting for mobile web server on :8081 (${lastReason})`
  );
}

async function runBundleWarmupRequest() {
  await new Promise((resolve, reject) => {
    const curl = spawn(
      "curl",
      [
        "--silent",
        "--show-error",
        "--fail",
        "--location",
        "--max-time",
        String(CURL_MAX_TIME_SECONDS),
        "--output",
        "/dev/null",
        MOBILE_BUNDLE_URL,
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    let stderr = "";
    curl.stderr?.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    curl.on("error", (error) => {
      reject(error);
    });

    curl.on("exit", (code, signal) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      const detail =
        stderr.trim() ||
        (signal
          ? `curl terminated by signal ${signal}`
          : `curl exited with code ${code ?? "unknown"}`);
      reject(new Error(detail));
    });
  });
}

async function warmUpMobileBundleInBackground() {
  const startedAt = Date.now();
  let attempts = 0;
  let lastReason = "unknown";

  while (Date.now() - startedAt < BUNDLE_WARMUP_TOTAL_TIMEOUT_MS) {
    attempts += 1;
    if (attempts === 1 || attempts % 3 === 0) {
      log("Warming up mobile bundle (non-blocking)");
    }
    try {
      await runBundleWarmupRequest();
      log("Mobile bundle warm-up complete");
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      lastReason = reason;
      await sleep(BUNDLE_WARMUP_RETRY_MS);
    }
  }

  console.warn(`[desktop-dev] Bundle warm-up skipped (${lastReason})`);
  return false;
}

async function terminateProcess(child, name) {
  if (!child || child.exitCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve();
    };

    child.once("exit", finish);
    child.kill("SIGTERM");

    setTimeout(() => {
      if (child.exitCode === null) {
        console.warn(`[desktop-dev] Force-killing ${name}`);
        child.kill("SIGKILL");
      }
    }, SHUTDOWN_TIMEOUT_MS).unref();
  });
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  await terminateProcess(tauriProcess, "tauri");
  if (startedMobileServer) {
    await terminateProcess(mobileProcess, "mobile-web");
  }

  process.exit(exitCode);
}

process.on("SIGINT", () => {
  // biome-ignore lint/complexity/noVoid: fire-and-forget async call
  void shutdown(0);
});

process.on("SIGTERM", () => {
  // biome-ignore lint/complexity/noVoid: fire-and-forget async call
  void shutdown(0);
});

process.on("unhandledRejection", (error) => {
  console.error("[desktop-dev] Unhandled rejection:", error);
  // biome-ignore lint/complexity/noVoid: fire-and-forget async call
  void shutdown(1);
});

process.on("uncaughtException", (error) => {
  console.error("[desktop-dev] Uncaught exception:", error);
  // biome-ignore lint/complexity/noVoid: fire-and-forget async call
  void shutdown(1);
});

async function main() {
  await waitForMobileReady();
  log("Starting Tauri desktop shell");

  tauriProcess = spawn("bun", ["x", "tauri", "dev"], {
    cwd: DESKTOP_DIR,
    stdio: "inherit",
    env: process.env,
  });

  tauriProcess.once("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }
    let nextCode = 0;
    if (typeof code === "number") {
      nextCode = code;
    } else if (signal) {
      nextCode = 1;
    }
    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void shutdown(nextCode);
  });

  // biome-ignore lint/complexity/noVoid: fire-and-forget async call
  void warmUpMobileBundleInBackground().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[desktop-dev] Bundle warm-up errored (${message})`);
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[desktop-dev] ${message}`);
  // biome-ignore lint/complexity/noVoid: fire-and-forget async call
  void shutdown(1);
});
