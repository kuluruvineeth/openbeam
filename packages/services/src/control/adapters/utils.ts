import { type ChildProcess, spawn } from "node:child_process";
import type { AdapterLogEvent } from "./types";

const MAX_CAPTURE_BYTES = 4 * 1024 * 1024;
const MAX_EXCERPT_BYTES = 32 * 1024;
const GRACE_PERIOD_MS = 5000;

const SENSITIVE_PATTERNS = [
  /key/i,
  /token/i,
  /secret/i,
  /password/i,
  /auth/i,
  /credential/i,
];

export interface RunProcessOptions {
  runId: string;
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
  onLog: (event: AdapterLogEvent) => Promise<void>;
}

export interface RunProcessResult {
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  stdoutExcerpt: string;
  stderrExcerpt: string;
}

export function runChildProcess(
  opts: RunProcessOptions
): Promise<RunProcessResult> {
  return new Promise((resolve) => {
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let stdoutExcerpt = "";
    let stderrExcerpt = "";
    let timedOut = false;
    let killed = false;

    const child: ChildProcess = spawn(opts.command, opts.args, {
      cwd: opts.cwd,
      env: opts.env,
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!killed) {
          child.kill("SIGKILL");
        }
      }, GRACE_PERIOD_MS);
    }, opts.timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stdoutBytes += chunk.length;
      if (stdoutExcerpt.length < MAX_EXCERPT_BYTES) {
        stdoutExcerpt += text.slice(
          0,
          MAX_EXCERPT_BYTES - stdoutExcerpt.length
        );
      }
      if (stdoutBytes <= MAX_CAPTURE_BYTES) {
        opts.onLog({ stream: "stdout", chunk: text });
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderrBytes += chunk.length;
      if (stderrExcerpt.length < MAX_EXCERPT_BYTES) {
        stderrExcerpt += text.slice(
          0,
          MAX_EXCERPT_BYTES - stderrExcerpt.length
        );
      }
      if (stderrBytes <= MAX_CAPTURE_BYTES) {
        opts.onLog({ stream: "stderr", chunk: text });
      }
    });

    child.on("close", (code, signal) => {
      killed = true;
      clearTimeout(timeout);
      resolve({
        exitCode: code,
        signal: signal ?? null,
        timedOut,
        stdoutExcerpt,
        stderrExcerpt,
      });
    });

    child.on("error", (err) => {
      killed = true;
      clearTimeout(timeout);
      resolve({
        exitCode: 1,
        signal: null,
        timedOut: false,
        stdoutExcerpt: "",
        stderrExcerpt: err.message,
      });
    });
  });
}

export function redactEnvForLogs(
  env: Record<string, string>
): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    const isSensitive = SENSITIVE_PATTERNS.some((p) => p.test(key));
    redacted[key] = isSensitive ? "***" : value;
  }
  return redacted;
}

export function buildAgentEnv(params: {
  agentId: string;
  teamId: string;
  runId: string;
  apiUrl?: string;
  taskKey?: string;
  wakeReason?: string;
  extra?: Record<string, string>;
}): Record<string, string> {
  const env: Record<string, string> = {
    ...process.env,
    OPENBEAM_AGENT_ID: params.agentId,
    OPENBEAM_TEAM_ID: params.teamId,
    OPENBEAM_RUN_ID: params.runId,
  } as Record<string, string>;

  if (params.apiUrl) {
    env.OPENBEAM_API_URL = params.apiUrl;
  }
  if (params.taskKey) {
    env.OPENBEAM_TASK_KEY = params.taskKey;
  }
  if (params.wakeReason) {
    env.OPENBEAM_WAKE_REASON = params.wakeReason;
  }

  if (params.extra) {
    Object.assign(env, params.extra);
  }

  return env;
}

export function appendWithCap(
  current: string,
  addition: string,
  maxBytes: number
): string {
  if (current.length >= maxBytes) {
    return current;
  }
  return current + addition.slice(0, maxBytes - current.length);
}

export function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }
  return fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}
