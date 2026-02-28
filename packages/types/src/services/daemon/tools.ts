import type { ToolCallTimelineItem } from "./agent";

export type ToolCallDisplayInput = Pick<
  ToolCallTimelineItem,
  "name" | "status" | "error" | "metadata" | "detail"
> & {
  cwd?: string;
};

export type ToolCallDisplayModel = {
  displayName: string;
  summary?: string;
  errorText?: string;
};

const SPECIAL_NAME_PATTERN = /[:./]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function stripCwdPrefix(filePath: string, cwd: string | undefined): string {
  if (!cwd) {
    return filePath;
  }
  const prefix = cwd.endsWith("/") ? cwd : `${cwd}/`;
  return filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath;
}

export function humanizeToolName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return name;
  }
  if (SPECIAL_NAME_PATTERN.test(trimmed) || trimmed.includes("__")) {
    return trimmed;
  }

  return trimmed
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter((segment) => segment.length > 0)
    .map((segment) => `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1)}`)
    .join(" ");
}

function formatErrorText(error: unknown): string | undefined {
  if (error === null || error === undefined) {
    return;
  }
  if (typeof error === "string") {
    return error;
  }
  if (isRecord(error) && typeof error.content === "string") {
    return error.content;
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

export function buildToolCallDisplayModel(
  input: ToolCallDisplayInput
): ToolCallDisplayModel {
  const lowerName = input.name.trim().toLowerCase();

  let displayName = humanizeToolName(input.name);
  let summary: string | undefined;

  switch (input.detail.type) {
    case "shell":
      displayName = "Shell";
      summary = input.detail.command;
      break;
    case "read":
      displayName = "Read";
      summary = stripCwdPrefix(input.detail.filePath, input.cwd);
      break;
    case "edit":
      displayName = "Edit";
      summary = stripCwdPrefix(input.detail.filePath, input.cwd);
      break;
    case "write":
      displayName = "Write";
      summary = stripCwdPrefix(input.detail.filePath, input.cwd);
      break;
    case "search":
      displayName = "Search";
      summary = input.detail.query;
      break;
    case "worktree_setup":
      displayName = "Worktree Setup";
      summary = input.detail.branchName;
      break;
    case "unknown":
      break;
    default:
      break;
  }

  if (lowerName === "task" && input.detail.type === "unknown") {
    displayName = "Task";
    summary = isRecord(input.metadata)
      ? readString(input.metadata.subAgentActivity)
      : undefined;
  } else if (lowerName === "thinking" && input.detail.type === "unknown") {
    displayName = "Thinking";
  }

  const errorText =
    input.status === "failed" ? formatErrorText(input.error) : undefined;

  return {
    displayName,
    ...(summary ? { summary } : {}),
    ...(errorText ? { errorText } : {}),
  };
}
