import { type ChildProcess, spawn } from "node:child_process";
import type {
  AdapterExecutionResult,
  AdapterUsageSummary,
} from "@openbeam/types/control/adapters";
import type { AdapterExecutionOptions } from "../types";
import {
  appendWithCap,
  asBoolean,
  asNumber,
  asString,
  buildAgentEnv,
} from "../utils";
import { parseCodexJsonLine } from "./parse";

const DEFAULT_TIMEOUT_MS = 600_000;
const MAX_EXCERPT_BYTES = 32 * 1024;
const MAX_CAPTURE_BYTES = 4 * 1024 * 1024;
const GRACE_PERIOD_MS = 5000;

export function executeCodex(
  opts: AdapterExecutionOptions
): Promise<AdapterExecutionResult> {
  const config = opts.config;
  const prompt = asString(config.prompt) || buildPromptFromContext(opts);

  if (!prompt) {
    return Promise.resolve({
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: "No prompt provided",
      errorCode: "missing_prompt",
    });
  }

  const args = buildCodexArgs(config, opts);
  const env = buildEnv(opts);
  const cwd = asString(config.cwd, process.cwd());
  const timeoutMs =
    asNumber(config.timeoutSec, DEFAULT_TIMEOUT_MS / 1000) * 1000;

  return spawnCodex({ args, env, cwd, timeoutMs, prompt, opts });
}

function buildCodexArgs(
  config: Record<string, unknown>,
  opts: AdapterExecutionOptions
): string[] {
  const args = ["exec"];

  const model = asString(config.model);
  if (model) {
    args.push("--model", model);
  }

  const reasoningEffort = asString(config.reasoningEffort);
  if (reasoningEffort) {
    args.push("-c", `model_reasoning_effort=${reasoningEffort}`);
  }

  if (asBoolean(config.dangerouslyBypassApprovals)) {
    args.push("--dangerously-bypass-approvals-and-sandbox");
  }

  if (asBoolean(config.search)) {
    args.push("--search");
  }

  const sessionId = opts.context.runtime.sessionId;
  if (sessionId) {
    args.push("resume", sessionId, "-");
  } else {
    args.push("-");
  }

  args.push("--json");

  return args;
}

function buildEnv(opts: AdapterExecutionOptions): Record<string, string> {
  const env = buildAgentEnv({
    agentId: opts.context.agent.id,
    teamId: opts.context.agent.teamId,
    runId: opts.runId,
    extra: opts.env,
  });

  const apiKey = asString(opts.config.apiKey);
  if (apiKey) {
    env.OPENAI_API_KEY = apiKey;
  }

  return env;
}

function buildPromptFromContext(opts: AdapterExecutionOptions): string {
  const taskKey = opts.context.runtime.taskKey;
  if (taskKey) {
    return `Execute task: ${taskKey}`;
  }
  return "";
}

interface SpawnCodexParams {
  args: string[];
  env: Record<string, string>;
  cwd: string;
  timeoutMs: number;
  prompt: string;
  opts: AdapterExecutionOptions;
}

function spawnCodex(params: SpawnCodexParams): Promise<AdapterExecutionResult> {
  return new Promise((resolve) => {
    let stdoutExcerpt = "";
    let stderrExcerpt = "";
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;
    let killed = false;
    let sessionId: string | null = null;
    let usage: AdapterUsageSummary | undefined;
    let model: string | undefined;
    let summary: string | undefined;
    let lineBuf = "";

    const child: ChildProcess = spawn("codex", params.args, {
      cwd: params.cwd,
      env: params.env as NodeJS.ProcessEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!killed) {
          child.kill("SIGKILL");
        }
      }, GRACE_PERIOD_MS);
    }, params.timeoutMs);

    child.stdin?.write(params.prompt);
    child.stdin?.end();

    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stdoutBytes += chunk.length;
      stdoutExcerpt = appendWithCap(stdoutExcerpt, text, MAX_EXCERPT_BYTES);

      if (stdoutBytes <= MAX_CAPTURE_BYTES) {
        params.opts.onLog({ stream: "stdout", chunk: text });
      }

      lineBuf += text;
      const lines = lineBuf.split("\n");
      lineBuf = lines.pop() ?? "";

      for (const line of lines) {
        const event = parseCodexJsonLine(line);
        if (!event) {
          continue;
        }
        if (event.sessionId) {
          sessionId = event.sessionId;
        }
        if (event.usage) {
          usage = event.usage;
        }
        if (event.model) {
          model = event.model;
        }
        if (event.type === "result" && event.text) {
          summary = event.text.slice(0, 1024);
        }
        if (event.sessionId || event.model) {
          params.opts.onMeta?.({ sessionId: sessionId ?? undefined, model });
        }
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderrBytes += chunk.length;
      stderrExcerpt = appendWithCap(stderrExcerpt, text, MAX_EXCERPT_BYTES);

      if (stderrBytes <= MAX_CAPTURE_BYTES) {
        params.opts.onLog({ stream: "stderr", chunk: text });
      }
    });

    child.on("close", (code, signal) => {
      killed = true;
      clearTimeout(timeout);

      const failed = code !== 0;

      let errorCode: string | null = null;
      if (timedOut) {
        errorCode = "timeout";
      } else if (failed) {
        errorCode = "exit_code";
      }

      resolve({
        exitCode: code,
        signal: signal ?? null,
        timedOut,
        errorMessage: failed
          ? stderrExcerpt.slice(0, 1024) || "Codex exited with non-zero code"
          : null,
        errorCode,
        usage,
        sessionId: sessionId ?? null,
        provider: "openai",
        model: model ?? null,
        billingType: "api",
        costUsd: null,
        summary: summary ?? null,
      });
    });

    child.on("error", (err) => {
      killed = true;
      clearTimeout(timeout);
      resolve({
        exitCode: 1,
        signal: null,
        timedOut: false,
        errorMessage: err.message,
        errorCode: "spawn_error",
      });
    });
  });
}
