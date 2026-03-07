import type { AdapterExecutionResult } from "@openbeam/types/control/adapters";
import type { AdapterExecutionOptions } from "../types";
import { asNumber, asString, buildAgentEnv, runChildProcess } from "../utils";

const DEFAULT_TIMEOUT_MS = 300_000;
const WHITESPACE_RE = /\s+/;

function deriveErrorCode(timedOut: boolean, failed: boolean): string | null {
  if (timedOut) {
    return "timeout";
  }
  if (failed) {
    return "exit_code";
  }
  return null;
}

function parseArgs(rawArgs: unknown): string[] {
  if (Array.isArray(rawArgs)) {
    return rawArgs.map(String);
  }
  if (typeof rawArgs === "string") {
    return rawArgs.split(WHITESPACE_RE);
  }
  return [];
}

export async function executeProcess(
  opts: AdapterExecutionOptions
): Promise<AdapterExecutionResult> {
  const config = opts.config;
  const command = asString(config.command);
  if (!command) {
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: "No command specified in adapter config",
      errorCode: "missing_command",
    };
  }

  const args = parseArgs(config.args);

  const cwd = asString(config.cwd, process.cwd());
  const timeoutMs =
    asNumber(config.timeoutSec, DEFAULT_TIMEOUT_MS / 1000) * 1000;

  const env = buildAgentEnv({
    agentId: opts.context.agent.id,
    teamId: opts.context.agent.teamId,
    runId: opts.runId,
    extra: opts.env,
  });

  const result = await runChildProcess({
    runId: opts.runId,
    command,
    args,
    cwd,
    env,
    timeoutMs,
    onLog: opts.onLog,
  });

  const failed = result.exitCode !== 0;

  return {
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    errorMessage: failed
      ? result.stderrExcerpt.slice(0, 1024) ||
        "Process exited with non-zero code"
      : null,
    errorCode: deriveErrorCode(result.timedOut, failed),
  };
}
