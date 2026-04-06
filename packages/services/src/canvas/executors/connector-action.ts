import prisma, {
  decryptIfEncrypted,
  getConnectorWithCredentials,
  getOAuthProvider,
  verifyConnectorOwnership,
} from "@openbeam/db";
import { ALL_CONNECTOR_ACTION_REGISTRIES } from "@openbeam/integrations/connector-actions";
import type {
  ConnectorActionError,
  ConnectorActionExecuteResult,
  ConnectorActionNodeConfig,
  RetryConfig,
} from "@openbeam/types/canvas";
import {
  ConnectorActionExecuteResultSchema,
  ConnectorActionNodeConfigSchema,
} from "@openbeam/types/canvas";
import type {
  ConnectorActionDefinition,
  ConnectorActionInput,
} from "@openbeam/types/connector-actions";
import { normalizeToConnectorType } from "@openbeam/types/services/connectors/events";
import type { GmailListMessagesResponse } from "@openbeam/types/services/connectors/gmail";
import { GmailListMessagesResponseSchema } from "@openbeam/types/services/connectors/gmail";
import {
  type DriveFile,
  DriveFileListResponseSchema,
  DriveFileSchema,
} from "@openbeam/types/services/connectors/google-drive";
import jmespath from "jmespath";
import {
  getActionDefinition,
  registerConnectorActions,
} from "../../connector-actions/registry";
import {
  createDraft,
  modifyMessageLabels,
  replyToEmail,
  sendEmail,
  trashMessage,
} from "../../gmail/actions";
import { listLabels } from "../../gmail/api/labels";
import { batchGetMessages, getMessage } from "../../gmail/api/messages";
import { getThread } from "../../gmail/api/threads";
import { createGmailClient } from "../../gmail/client";
import {
  extractContent,
  extractEmailAddress,
  parseHeaders,
} from "../../gmail/utils/content-extractor";
import {
  copyFile,
  createFile,
  deleteFile,
  moveFile,
  renameFile,
} from "../../google-drive/actions/files";
import { createFolder } from "../../google-drive/actions/folders";
import {
  revokeAccess,
  shareWithUser,
} from "../../google-drive/actions/permissions";
import { getFile } from "../../google-drive/api/files";
import { createGoogleDriveClient } from "../../google-drive/client";
import { GoogleDriveApiError } from "../../google-drive/types";
import { getValidAccessToken } from "../../lib/token-refresh";
import { getCycle, getTeamCycles } from "../../linear/api/cycles";
import { getIssue } from "../../linear/api/issues";
import { getProject } from "../../linear/api/projects";
import { createLinearClient } from "../../linear/client";
import { addPageComment } from "../../notion/actions/comments";
import {
  archivePage,
  createPage,
  getPage,
  updatePage,
} from "../../notion/actions/pages";
import { appendBlockChildren, deleteBlock } from "../../notion/api/blocks";
import {
  createDatabase,
  type DatabaseQuerySort,
  queryDatabase,
} from "../../notion/api/databases";
import { search as notionSearch } from "../../notion/api/search";
import { createNotionClient } from "../../notion/client";
import { extractPageTitle } from "../../notion/utils/content-extractor";
import { createTextRichText } from "../../notion/utils/rich-text";
import {
  addReaction,
  archiveChannel,
  createChannel,
  inviteToChannel,
  sendDM,
  sendMessage,
  setChannelPurpose,
  setChannelTopic,
  updateMessage,
} from "../../slack/actions";
import { addBookmark } from "../../slack/api/bookmarks";
import { searchMessages } from "../../slack/api/search";
import { getUserInfo } from "../../slack/api/users";
import { createSlackClient } from "../../slack/client";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutionInput, CanvasNodeExecutor } from "../types";

const VARIABLE_REF = /^\s*{{\s*([^}]+)\s*}}\s*$/;
const HTML_TAG = /<[^>]+>/;
const DEFAULT_TIMEOUT_MS = 30_000;

let registriesReady = false;

function ensureRegistriesReady(): void {
  if (registriesReady) {
    return;
  }
  for (const registry of ALL_CONNECTOR_ACTION_REGISTRIES) {
    registerConnectorActions(registry);
  }
  registriesReady = true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeConnectorType(value: string): string {
  return value.trim().toLowerCase().replace(/-/g, "_");
}

function normalizeVariableRef(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(VARIABLE_REF);
  const candidate = match?.[1] ?? trimmed;
  if (!(match || trimmed.startsWith("$") || trimmed.startsWith("."))) {
    return null;
  }
  let expression = candidate.trim();
  if (expression.startsWith("$.")) {
    expression = expression.slice(2);
  } else if (expression.startsWith("$")) {
    expression = expression.slice(1);
  }
  if (expression.startsWith(".")) {
    expression = expression.slice(1);
  }
  return expression.trim() || null;
}

function resolvePath(value: unknown, path: string): unknown {
  try {
    return jmespath.search(value ?? null, path);
  } catch {
    return;
  }
}

function resolveMappingValue(
  value: unknown,
  input: unknown,
  context: CanvasNodeExecutionInput["context"],
  node: CanvasNodeExecutionInput["node"]
): unknown {
  if (typeof value !== "string") {
    return value;
  }
  const expression = normalizeVariableRef(value);
  if (!expression) {
    return value;
  }
  const direct = resolvePath(input, expression);
  if (direct !== undefined) {
    return direct;
  }
  const composite = {
    input,
    context,
    node: { id: node.id, type: node.type },
  };
  return resolvePath(composite, expression);
}

function normalizeEmpty(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") {
    return;
  }
  return value;
}

function parseJsonValue(value: unknown, label: string): unknown {
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`Invalid JSON for ${label}`);
    }
  }
  return value;
}

function parseNotionSorts(value: unknown): DatabaseQuerySort[] | undefined {
  if (value === undefined || value === null) {
    return;
  }
  if (!Array.isArray(value)) {
    throw new Error("Sorts must be an array");
  }
  if (value.length === 0) {
    return;
  }
  return value.map((entry) => {
    if (!isRecord(entry)) {
      throw new Error("Sorts must be objects");
    }
    const direction = entry.direction;
    if (direction !== "ascending" && direction !== "descending") {
      throw new Error("Sort direction is required");
    }
    const sort: DatabaseQuerySort = { direction };
    if (typeof entry.property === "string") {
      sort.property = entry.property;
    }
    if (
      entry.timestamp === "created_time" ||
      entry.timestamp === "last_edited_time"
    ) {
      sort.timestamp = entry.timestamp;
    }
    return sort;
  });
}

function coerceInputValue(def: ConnectorActionInput, value: unknown): unknown {
  const resolved = normalizeEmpty(value);
  if (resolved === undefined) {
    return;
  }

  switch (def.type) {
    case "number": {
      if (typeof resolved === "number") {
        return resolved;
      }
      const num = Number(resolved);
      if (Number.isNaN(num)) {
        throw new Error(`${def.name} must be a number`);
      }
      return num;
    }
    case "boolean": {
      if (typeof resolved === "boolean") {
        return resolved;
      }
      if (typeof resolved === "string") {
        if (resolved.toLowerCase() === "true") {
          return true;
        }
        if (resolved.toLowerCase() === "false") {
          return false;
        }
      }
      return Boolean(resolved);
    }
    case "json":
    case "object":
    case "array":
      return parseJsonValue(resolved, def.name);
    case "date": {
      if (resolved instanceof Date) {
        return resolved.toISOString();
      }
      if (typeof resolved === "number") {
        return new Date(resolved).toISOString();
      }
      return String(resolved).trim();
    }
    default:
      return typeof resolved === "string" ? resolved.trim() : resolved;
  }
}

function validateValue(def: ConnectorActionInput, value: unknown): void {
  if (!def.validation || value === undefined || value === null) {
    return;
  }
  if (typeof value === "number") {
    if (def.validation.min !== undefined && value < def.validation.min) {
      throw new Error(`${def.name} must be >= ${def.validation.min}`);
    }
    if (def.validation.max !== undefined && value > def.validation.max) {
      throw new Error(`${def.name} must be <= ${def.validation.max}`);
    }
  }
  if (typeof value === "string") {
    if (
      def.validation.minLength !== undefined &&
      value.length < def.validation.minLength
    ) {
      throw new Error(`${def.name} is too short`);
    }
    if (
      def.validation.maxLength !== undefined &&
      value.length > def.validation.maxLength
    ) {
      throw new Error(`${def.name} is too long`);
    }
    if (def.validation.pattern) {
      const regex = new RegExp(def.validation.pattern);
      if (!regex.test(value)) {
        throw new Error(`${def.name} is invalid`);
      }
    }
  }
}

function buildActionInputs(params: {
  action: ConnectorActionDefinition;
  config: ConnectorActionNodeConfig;
  input: unknown;
  context: CanvasNodeExecutionInput["context"];
  node: CanvasNodeExecutionInput["node"];
}): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const def of params.action.inputs) {
    const rawMapping = params.config.inputMappings[def.id];
    const resolvedMapping = resolveMappingValue(
      rawMapping,
      params.input,
      params.context,
      params.node
    );
    const value =
      resolvedMapping === undefined
        ? def.default
        : coerceInputValue(def, resolvedMapping);

    if (value === undefined || value === null || value === "") {
      if (def.required) {
        throw new Error(`${def.name} is required`);
      }
      continue;
    }

    validateValue(def, value);
    resolved[def.id] = value;
  }

  return resolved;
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (value === undefined || value === null) {
    return [];
  }
  return [String(value).trim()].filter(Boolean);
}

function ensureString(value: unknown, label: string): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (value === undefined || value === null) {
    throw new Error(`${label} is required`);
  }
  return String(value).trim();
}

function looksLikeHtml(value: string): boolean {
  return HTML_TAG.test(value);
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(value);
  }
  return result;
}

function uniqueExact(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}

function normalizeEmailList(values: unknown[]): string[] {
  const flattened = values
    .flatMap((value) => (value ? parseStringArray(value) : []))
    .map((item) => extractEmailAddress(item) ?? item.trim())
    .filter(Boolean);
  return uniqueStrings(flattened);
}

function sanitizeOutput(result: unknown): unknown {
  if (result === undefined) {
    return null;
  }
  return result;
}

interface ConnectorError {
  code: string;
  message: string;
  retryable: boolean;
}

function isConnectorError(error: unknown): error is ConnectorError {
  return (
    isRecord(error) &&
    typeof error.code === "string" &&
    typeof error.message === "string" &&
    typeof error.retryable === "boolean"
  );
}

function toActionError(error: unknown): ConnectorActionError {
  if (isConnectorError(error)) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    };
  }
  if (error instanceof Error) {
    return {
      code: "INTERNAL_ERROR",
      message: error.message,
      retryable: false,
    };
  }
  return {
    code: "INTERNAL_ERROR",
    message: String(error ?? "Unknown error"),
    retryable: false,
  };
}

function shouldRetry(
  error: ConnectorActionError,
  config?: RetryConfig
): boolean {
  if (!config) {
    return false;
  }
  if (config.retryOnErrors && config.retryOnErrors.length > 0) {
    return config.retryOnErrors.includes(error.code);
  }
  return error.retryable;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return await promise;
  }
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Action timed out"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function executeWithRetry<T>(params: {
  execute: () => Promise<T>;
  retryConfig?: RetryConfig;
  timeoutMs: number;
}): Promise<{ result: T; retryCount: number; durationMs: number }> {
  const retryConfig = params.retryConfig;
  const maxAttempts = retryConfig?.maxAttempts ?? 1;
  let attempt = 0;
  let backoff = retryConfig?.backoffMs ?? 1000;
  const startedAt = Date.now();

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const result = await withTimeout(params.execute(), params.timeoutMs);
      return {
        result,
        retryCount: attempt - 1,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      const actionError = toActionError(error);
      if (attempt >= maxAttempts || !shouldRetry(actionError, retryConfig)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, backoff));
      if (retryConfig?.exponential !== false) {
        backoff *= 2;
      }
    }
  }

  throw new Error("Action failed after retries");
}

type SlackActionContext = {
  client: ReturnType<typeof createSlackClient>;
  inputs: Record<string, unknown>;
};

async function slackMessageSend(
  context: SlackActionContext
): Promise<Record<string, unknown>> {
  const blocks = Array.isArray(context.inputs.blocks)
    ? context.inputs.blocks
    : undefined;
  const result = await sendMessage(context.client, {
    channel: ensureString(context.inputs.channel, "Channel"),
    text: ensureString(context.inputs.text, "Text"),
    threadTs:
      typeof context.inputs.thread_ts === "string"
        ? context.inputs.thread_ts
        : undefined,
    blocks,
  });
  if (!result.success) {
    throw new Error(result.error ?? "Slack message send failed");
  }
  return {
    ts: result.messageTs ?? "",
    channel: result.channelId ?? "",
  };
}

async function slackMessageUpdate(
  context: SlackActionContext
): Promise<Record<string, unknown>> {
  const blocks = Array.isArray(context.inputs.blocks)
    ? context.inputs.blocks
    : undefined;
  const result = await updateMessage(context.client, {
    channel: ensureString(context.inputs.channel, "Channel"),
    ts: ensureString(context.inputs.ts, "Timestamp"),
    text: ensureString(context.inputs.text, "Text"),
    blocks,
  });
  if (!result.success) {
    throw new Error(result.error ?? "Slack message update failed");
  }
  return { ts: result.messageTs ?? "" };
}

async function slackMessageDelete(
  context: SlackActionContext
): Promise<Record<string, unknown>> {
  const response = await context.client.call<{ ok: boolean; error?: string }>(
    "chat.delete",
    {
      channel: ensureString(context.inputs.channel, "Channel"),
      ts: ensureString(context.inputs.ts, "Timestamp"),
    }
  );
  if (!response.ok) {
    throw new Error(response.error ?? "Slack delete failed");
  }
  return { ok: true };
}

async function slackMessageReply(
  context: SlackActionContext
): Promise<Record<string, unknown>> {
  const result = await sendMessage(context.client, {
    channel: ensureString(context.inputs.channel, "Channel"),
    text: ensureString(context.inputs.text, "Text"),
    threadTs: ensureString(context.inputs.thread_ts, "Thread Timestamp"),
  });
  if (!result.success) {
    throw new Error(result.error ?? "Slack reply failed");
  }
  return { ts: result.messageTs ?? "" };
}

async function slackMessageAddReaction(
  context: SlackActionContext
): Promise<Record<string, unknown>> {
  const result = await addReaction(context.client, {
    channel: ensureString(context.inputs.channel, "Channel"),
    timestamp: ensureString(context.inputs.ts, "Timestamp"),
    emoji: ensureString(context.inputs.name, "Emoji"),
  });
  if (!result.success) {
    throw new Error(result.error ?? "Slack reaction failed");
  }
  return { ok: true };
}

async function slackMessageSearch(
  context: SlackActionContext
): Promise<Record<string, unknown>> {
  const result = await searchMessages(
    context.client,
    ensureString(context.inputs.query, "Query"),
    {
      count:
        typeof context.inputs.count === "number"
          ? context.inputs.count
          : undefined,
      sort: context.inputs.sort === "timestamp" ? "timestamp" : "score",
    }
  );
  return {
    messages: result.matches,
    total: result.total,
  };
}

async function slackChannelCreate(
  context: SlackActionContext
): Promise<Record<string, unknown>> {
  const name = ensureString(context.inputs.name, "Name");
  const result = await createChannel(context.client, {
    name,
    isPrivate:
      typeof context.inputs.is_private === "boolean"
        ? context.inputs.is_private
        : undefined,
  });
  if (!result.success) {
    throw new Error(result.error ?? "Slack channel creation failed");
  }
  if (typeof context.inputs.description === "string" && result.channelId) {
    await setChannelPurpose(context.client, {
      channel: result.channelId,
      purpose: context.inputs.description,
    });
  }
  return { id: result.channelId ?? "", name };
}

async function slackChannelArchive(
  context: SlackActionContext
): Promise<Record<string, unknown>> {
  const result = await archiveChannel(
    context.client,
    ensureString(context.inputs.channel, "Channel")
  );
  if (!result.success) {
    throw new Error(result.error ?? "Slack channel archive failed");
  }
  return { ok: true };
}

async function slackChannelSetTopic(
  context: SlackActionContext
): Promise<Record<string, unknown>> {
  const topic = ensureString(context.inputs.topic, "Topic");
  const result = await setChannelTopic(context.client, {
    channel: ensureString(context.inputs.channel, "Channel"),
    topic,
  });
  if (!result.success) {
    throw new Error(result.error ?? "Slack set topic failed");
  }
  return { topic };
}

async function slackChannelInvite(
  context: SlackActionContext
): Promise<Record<string, unknown>> {
  const users = parseStringArray(context.inputs.user);
  if (users.length === 0) {
    throw new Error("User is required");
  }
  const result = await inviteToChannel(context.client, {
    channel: ensureString(context.inputs.channel, "Channel"),
    users,
  });
  if (!result.success) {
    throw new Error(result.error ?? "Slack invite failed");
  }
  return { ok: true };
}

async function slackUserLookup(
  context: SlackActionContext
): Promise<Record<string, unknown>> {
  const email =
    typeof context.inputs.email === "string" ? context.inputs.email.trim() : "";
  const userId =
    typeof context.inputs.user_id === "string"
      ? context.inputs.user_id.trim()
      : "";
  if (!(email || userId)) {
    throw new Error("Email or user ID is required");
  }
  const user = userId
    ? await getUserInfo(context.client, userId)
    : await context.client
        .call<{ user?: unknown; ok: boolean }>("users.lookupByEmail", {
          email,
        })
        .then((response) => (response.user as { id: string } | null) ?? null)
        .then((u) => (u ? getUserInfo(context.client, u.id) : null));
  if (!user) {
    throw new Error("User not found");
  }
  return {
    id: user.id,
    name: user.profile?.display_name ?? user.real_name ?? user.name,
    email: user.profile?.email ?? "",
  };
}

async function slackFileUpload(
  context: SlackActionContext
): Promise<Record<string, unknown>> {
  const channels = parseStringArray(context.inputs.channels);
  if (channels.length === 0) {
    throw new Error("Channels are required");
  }
  const filename = ensureString(context.inputs.filename, "Filename");
  const content =
    typeof context.inputs.content === "string"
      ? context.inputs.content
      : undefined;
  if (!content) {
    throw new Error("Content is required");
  }
  const response = await context.client.call<{
    ok: boolean;
    file?: { id: string; url_private?: string; url_private_download?: string };
    error?: string;
  }>("files.upload", {
    channels: channels.join(","),
    content,
    filename,
    title:
      typeof context.inputs.title === "string"
        ? context.inputs.title
        : undefined,
  });
  if (!(response.ok && response.file)) {
    throw new Error(response.error ?? "Slack file upload failed");
  }
  return {
    id: response.file.id,
    url: response.file.url_private_download ?? response.file.url_private ?? "",
  };
}

async function slackDMSend(
  context: SlackActionContext
): Promise<Record<string, unknown>> {
  const result = await sendDM(context.client, {
    userId: ensureString(context.inputs.user, "User"),
    text: ensureString(context.inputs.text, "Text"),
  });
  if (!result.success) {
    throw new Error(result.error ?? "Slack DM failed");
  }
  return { ts: result.messageTs ?? "", channel: result.channelId ?? "" };
}

async function slackBookmarkAdd(
  context: SlackActionContext
): Promise<Record<string, unknown>> {
  const bookmark = await addBookmark(
    context.client,
    ensureString(context.inputs.channel, "Channel"),
    {
      title: ensureString(context.inputs.title, "Title"),
      type: "link",
      link: ensureString(context.inputs.link, "Link"),
    }
  );
  if (!bookmark) {
    throw new Error("Slack bookmark creation failed");
  }
  return { id: bookmark.id };
}

const slackActionHandlers: Record<
  string,
  (context: SlackActionContext) => Promise<Record<string, unknown>>
> = {
  message_send: slackMessageSend,
  message_update: slackMessageUpdate,
  message_delete: slackMessageDelete,
  message_reply: slackMessageReply,
  message_add_reaction: slackMessageAddReaction,
  message_search: slackMessageSearch,
  channel_create: slackChannelCreate,
  channel_archive: slackChannelArchive,
  channel_set_topic: slackChannelSetTopic,
  channel_invite: slackChannelInvite,
  user_lookup: slackUserLookup,
  file_upload: slackFileUpload,
  dm_send: slackDMSend,
  bookmark_add: slackBookmarkAdd,
};

async function executeSlackAction(params: {
  actionId: string;
  inputs: Record<string, unknown>;
  connectorId: string;
  connectorConfig: Record<string, unknown>;
  timeoutMs: number;
}): Promise<Record<string, unknown>> {
  const oauth = await getOAuthProvider(prisma, params.connectorId);
  if (!oauth) {
    throw new Error("OAuth provider not found for connector");
  }
  const accessToken = decryptIfEncrypted(
    oauth.accessToken,
    oauth.accessTokenIv
  );
  const syncToken = decryptIfEncrypted(
    oauth.syncAccessToken,
    oauth.syncAccessTokenIv
  );
  const token =
    params.actionId === "message_search"
      ? (syncToken ?? accessToken)
      : (accessToken ?? syncToken);
  if (!token) {
    throw new Error("Slack access token not available");
  }

  const teamId =
    typeof params.connectorConfig.teamId === "string"
      ? params.connectorConfig.teamId
      : undefined;

  const client = createSlackClient({
    connectorId: params.connectorId,
    token,
    teamId,
    timeout: params.timeoutMs,
  });

  const handler = slackActionHandlers[params.actionId];
  if (!handler) {
    throw new Error(`Unsupported Slack action: ${params.actionId}`);
  }
  return await handler({ client, inputs: params.inputs });
}
type GmailActionContext = {
  client: ReturnType<typeof createGmailClient>;
  inputs: Record<string, unknown>;
  userEmail?: string;
};

async function gmailEmailSend(
  context: GmailActionContext
): Promise<Record<string, unknown>> {
  const to = normalizeEmailList([context.inputs.to]);
  if (to.length === 0) {
    throw new Error("Recipient is required");
  }
  const body = ensureString(context.inputs.body, "Body");
  const result = await sendEmail(context.client, {
    to,
    subject: ensureString(context.inputs.subject, "Subject"),
    body,
    cc: normalizeEmailList([context.inputs.cc]),
    bcc: normalizeEmailList([context.inputs.bcc]),
    replyTo:
      typeof context.inputs.reply_to === "string"
        ? context.inputs.reply_to.trim()
        : undefined,
    isHtml: looksLikeHtml(body),
  });
  if (!result.success) {
    throw new Error(result.error ?? "Gmail send failed");
  }
  return { id: result.messageId ?? "", threadId: result.threadId ?? "" };
}

async function gmailEmailReply(
  context: GmailActionContext
): Promise<Record<string, unknown>> {
  const threadId = ensureString(context.inputs.threadId, "Thread ID");
  const messageId = ensureString(context.inputs.messageId, "Message ID");
  const body = ensureString(context.inputs.body, "Body");
  const message = await getMessage(context.client, messageId, {
    format: "metadata",
  });
  if (!message) {
    throw new Error("Message not found");
  }
  const headers = parseHeaders(message);
  const replyTo = headers.from ? extractEmailAddress(headers.from) : undefined;
  if (!replyTo) {
    throw new Error("Reply recipient not found");
  }
  const replyAll =
    typeof context.inputs.replyAll === "boolean"
      ? context.inputs.replyAll
      : false;
  const cc = replyAll ? normalizeEmailList(headers.cc ?? []) : [];
  const to = replyAll
    ? normalizeEmailList([replyTo, ...(headers.to ?? [])])
    : [replyTo];
  const userEmail = context.userEmail?.toLowerCase();
  const filteredTo = userEmail
    ? to.filter((addr) => addr.toLowerCase() !== userEmail)
    : to;
  const filteredCc = userEmail
    ? cc.filter((addr) => addr.toLowerCase() !== userEmail)
    : cc;
  const finalTo = filteredTo.length > 0 ? filteredTo : [replyTo];
  const result = await replyToEmail(context.client, {
    threadId,
    messageId,
    to: finalTo,
    cc: filteredCc.length > 0 ? filteredCc : undefined,
    body,
    isHtml: looksLikeHtml(body),
  });
  if (!result.success) {
    throw new Error(result.error ?? "Gmail reply failed");
  }
  return { id: result.messageId ?? "" };
}

async function gmailEmailForward(
  context: GmailActionContext
): Promise<Record<string, unknown>> {
  const messageId = ensureString(context.inputs.messageId, "Message ID");
  const to = normalizeEmailList([context.inputs.to]);
  if (to.length === 0) {
    throw new Error("Recipient is required");
  }
  const message = await getMessage(context.client, messageId, {
    format: "full",
  });
  if (!message) {
    throw new Error("Message not found");
  }
  const headers = parseHeaders(message);
  const subject = headers.subject ?? "";
  const forwardSubject = subject.toLowerCase().startsWith("fwd:")
    ? subject
    : `Fwd: ${subject}`.trim();
  const extracted = extractContent(message);
  const originalText =
    extracted.html ?? extracted.plain ?? message.snippet ?? "";
  const extraBody =
    typeof context.inputs.body === "string" ? context.inputs.body.trim() : "";
  const delimiter =
    looksLikeHtml(originalText) || looksLikeHtml(extraBody)
      ? "<br/><br/>--- Forwarded message ---<br/><br/>"
      : "\n\n--- Forwarded message ---\n\n";
  const body = extraBody
    ? `${extraBody}${delimiter}${originalText}`
    : originalText;
  const result = await sendEmail(context.client, {
    to,
    subject: forwardSubject,
    body,
    isHtml: looksLikeHtml(body),
  });
  if (!result.success) {
    throw new Error(result.error ?? "Gmail forward failed");
  }
  return { id: result.messageId ?? "" };
}

async function gmailEmailSearch(
  context: GmailActionContext
): Promise<Record<string, unknown>> {
  const query = ensureString(context.inputs.query, "Query");
  const maxResults =
    typeof context.inputs.maxResults === "number"
      ? context.inputs.maxResults
      : 50;
  const labelIds = parseStringArray(context.inputs.labelIds);
  const response = await context.client.get<GmailListMessagesResponse>(
    "/users/me/messages",
    {
      q: query,
      maxResults: Math.min(maxResults, 500),
      labelIds: labelIds.length > 0 ? labelIds : undefined,
    }
  );
  const parsed = GmailListMessagesResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("Gmail search failed");
  }
  const messageIds = parsed.data.messages?.map((m) => m.id) ?? [];
  const messages = await batchGetMessages(context.client, messageIds, {
    format: "full",
  });
  return {
    messages,
    resultSizeEstimate: parsed.data.resultSizeEstimate ?? messages.length,
  };
}

async function gmailEmailGet(
  context: GmailActionContext
): Promise<Record<string, unknown>> {
  const messageId = ensureString(context.inputs.messageId, "Message ID");
  const format =
    context.inputs.format === "metadata" || context.inputs.format === "minimal"
      ? context.inputs.format
      : "full";
  const message = await getMessage(context.client, messageId, { format });
  if (!message) {
    throw new Error("Message not found");
  }
  const headers = parseHeaders(message);
  return {
    id: message.id,
    threadId: message.threadId,
    subject: headers.subject ?? "",
    from: headers.from ?? "",
    snippet: message.snippet ?? "",
  };
}

async function gmailEmailTrash(
  context: GmailActionContext
): Promise<Record<string, unknown>> {
  const messageId = ensureString(context.inputs.messageId, "Message ID");
  const result = await trashMessage(context.client, messageId);
  if (!result.success) {
    throw new Error(result.error ?? "Gmail trash failed");
  }
  return { id: result.messageId ?? messageId };
}

async function gmailEmailModifyLabels(
  context: GmailActionContext
): Promise<Record<string, unknown>> {
  const messageId = ensureString(context.inputs.messageId, "Message ID");
  const addLabelIds = parseStringArray(context.inputs.addLabelIds);
  const removeLabelIds = parseStringArray(context.inputs.removeLabelIds);
  const result = await modifyMessageLabels(context.client, {
    messageId,
    addLabelIds: addLabelIds.length ? addLabelIds : undefined,
    removeLabelIds: removeLabelIds.length ? removeLabelIds : undefined,
  });
  if (!result.success) {
    throw new Error(result.error ?? "Gmail label update failed");
  }
  return { id: result.messageId ?? messageId, labelIds: result.labelIds ?? [] };
}

async function gmailLabelList(
  context: GmailActionContext
): Promise<Record<string, unknown>> {
  const labels = await listLabels(context.client);
  return { labels };
}

async function gmailLabelCreate(
  context: GmailActionContext
): Promise<Record<string, unknown>> {
  const name = ensureString(context.inputs.name, "Name");
  const labelListVisibility =
    typeof context.inputs.labelListVisibility === "string"
      ? context.inputs.labelListVisibility
      : undefined;
  const response = await context.client.post<{ id: string; name: string }>(
    "/users/me/labels",
    {
      name,
      labelListVisibility,
      messageListVisibility: labelListVisibility ?? "show",
    }
  );
  return { id: response.id, name: response.name };
}

async function gmailDraftCreate(
  context: GmailActionContext
): Promise<Record<string, unknown>> {
  const to = normalizeEmailList([context.inputs.to]);
  if (to.length === 0) {
    throw new Error("Recipient is required");
  }
  const body = ensureString(context.inputs.body, "Body");
  const result = await createDraft(context.client, {
    to,
    subject: ensureString(context.inputs.subject, "Subject"),
    body,
    isHtml: looksLikeHtml(body),
  });
  if (!result.success) {
    throw new Error(result.error ?? "Gmail draft failed");
  }
  return { id: result.draftId ?? "", messageId: result.messageId ?? "" };
}

async function gmailThreadGet(
  context: GmailActionContext
): Promise<Record<string, unknown>> {
  const threadId = ensureString(context.inputs.threadId, "Thread ID");
  const thread = await getThread(context.client, threadId, { format: "full" });
  if (!thread) {
    throw new Error("Thread not found");
  }
  return {
    id: thread.id,
    messages: thread.messages ?? [],
    snippet: thread.snippet ?? "",
  };
}

async function gmailThreadTrash(
  context: GmailActionContext
): Promise<Record<string, unknown>> {
  const threadId = ensureString(context.inputs.threadId, "Thread ID");
  const response = await context.client.post<{ id: string }>(
    `/users/me/threads/${threadId}/trash`,
    {}
  );
  return { id: response.id ?? threadId };
}

const gmailActionHandlers: Record<
  string,
  (context: GmailActionContext) => Promise<Record<string, unknown>>
> = {
  email_send: gmailEmailSend,
  email_reply: gmailEmailReply,
  email_forward: gmailEmailForward,
  email_search: gmailEmailSearch,
  email_get: gmailEmailGet,
  email_trash: gmailEmailTrash,
  email_modify_labels: gmailEmailModifyLabels,
  label_list: gmailLabelList,
  label_create: gmailLabelCreate,
  draft_create: gmailDraftCreate,
  thread_get: gmailThreadGet,
  thread_trash: gmailThreadTrash,
};

async function executeGmailAction(params: {
  actionId: string;
  inputs: Record<string, unknown>;
  connectorId: string;
  connectorConfig: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const userEmail =
    typeof params.connectorConfig.userEmail === "string"
      ? params.connectorConfig.userEmail
      : undefined;
  const client = createGmailClient({
    connectorId: params.connectorId,
    userEmail,
  });

  const handler = gmailActionHandlers[params.actionId];
  if (!handler) {
    throw new Error(`Unsupported Gmail action: ${params.actionId}`);
  }
  return await handler({ client, inputs: params.inputs, userEmail });
}
async function executeNotionAction(params: {
  actionId: string;
  inputs: Record<string, unknown>;
  connectorId: string;
}): Promise<Record<string, unknown>> {
  const client = createNotionClient({ connectorId: params.connectorId });

  switch (params.actionId) {
    case "page_create": {
      const parentId = ensureString(params.inputs.parentId, "Parent ID");
      const title = ensureString(params.inputs.title, "Title");
      const properties = isRecord(params.inputs.properties)
        ? params.inputs.properties
        : parseJsonValue(params.inputs.properties, "Properties");
      const propertyRecord = isRecord(properties) ? properties : undefined;
      const content =
        typeof params.inputs.content === "string"
          ? params.inputs.content
          : undefined;
      const parentType =
        propertyRecord && Object.keys(propertyRecord).length > 0
          ? "database"
          : "page";
      const result = await createPage(client, {
        parentId,
        parentType,
        title,
        properties: propertyRecord,
        content,
      });
      if (!result.success) {
        throw new Error(result.error ?? "Notion create page failed");
      }
      return { id: result.pageId ?? "", url: result.url ?? "" };
    }
    case "page_get": {
      const pageId = ensureString(params.inputs.pageId, "Page ID");
      const page = await getPage(client, pageId);
      if (!page) {
        throw new Error("Page not found");
      }
      return {
        id: page.id,
        url: page.url ?? "",
        properties: page.properties ?? {},
        title: extractPageTitle(page),
      };
    }
    case "page_update": {
      const pageId = ensureString(params.inputs.pageId, "Page ID");
      const properties = parseJsonValue(params.inputs.properties, "Properties");
      if (!isRecord(properties)) {
        throw new Error("Properties must be an object");
      }
      const result = await updatePage(client, pageId, { properties });
      if (!result.success) {
        throw new Error(result.error ?? "Notion update page failed");
      }
      return { id: result.pageId ?? "", url: result.url ?? "" };
    }
    case "page_archive": {
      const pageId = ensureString(params.inputs.pageId, "Page ID");
      const result = await archivePage(client, pageId);
      if (!result.success) {
        throw new Error(result.error ?? "Notion archive page failed");
      }
      return { id: result.pageId ?? "" };
    }
    case "database_query": {
      const databaseId = ensureString(params.inputs.databaseId, "Database ID");
      const filter = parseJsonValue(params.inputs.filter, "Filter");
      const sortsInput = parseJsonValue(params.inputs.sorts, "Sorts");
      const pageSize =
        typeof params.inputs.pageSize === "number"
          ? params.inputs.pageSize
          : undefined;
      const response = await queryDatabase(client, databaseId, {
        filter: isRecord(filter) ? filter : undefined,
        sorts: parseNotionSorts(sortsInput),
        pageSize,
      });
      return {
        results: response.results,
        hasMore: response.has_more,
        nextCursor: response.next_cursor ?? "",
      };
    }
    case "database_create": {
      const parentId = ensureString(params.inputs.parentId, "Parent ID");
      const title = ensureString(params.inputs.title, "Title");
      const properties = parseJsonValue(params.inputs.properties, "Properties");
      if (!isRecord(properties)) {
        throw new Error("Properties must be an object");
      }
      const db = await createDatabase(client, {
        parent: { type: "page_id", page_id: parentId },
        title: createTextRichText(title),
        properties,
      });
      return { id: db.id, url: db.url ?? "" };
    }
    case "block_append": {
      const pageId = ensureString(params.inputs.pageId, "Page ID");
      const content = ensureString(params.inputs.content, "Content");
      const lines = content.split("\n").filter((line) => line.trim());
      const blocks =
        lines.length > 0
          ? lines.map((line) => ({
              object: "block",
              type: "paragraph",
              paragraph: { rich_text: createTextRichText(line) },
            }))
          : [
              {
                object: "block",
                type: "paragraph",
                paragraph: { rich_text: createTextRichText(content) },
              },
            ];
      const response = await appendBlockChildren(client, pageId, {
        children: blocks,
      });
      return { results: response.results };
    }
    case "block_delete": {
      const blockId = ensureString(params.inputs.blockId, "Block ID");
      const block = await deleteBlock(client, blockId);
      return { id: block.id ?? blockId };
    }
    case "search": {
      const query = ensureString(params.inputs.query, "Query");
      const filterValue =
        params.inputs.filter === "database" || params.inputs.filter === "page"
          ? params.inputs.filter
          : undefined;
      const pageSize =
        typeof params.inputs.pageSize === "number"
          ? params.inputs.pageSize
          : undefined;
      const response = await notionSearch(client, {
        query,
        filter: filterValue
          ? { property: "object", value: filterValue }
          : undefined,
        pageSize,
      });
      return { results: response.results, hasMore: response.has_more };
    }
    case "comment_create": {
      const pageId = ensureString(params.inputs.pageId, "Page ID");
      const text = ensureString(params.inputs.text, "Text");
      const result = await addPageComment(client, pageId, text);
      if (!result.success) {
        throw new Error(result.error ?? "Notion comment failed");
      }
      return { id: result.commentId ?? "" };
    }
    default:
      throw new Error(`Unsupported Notion action: ${params.actionId}`);
  }
}

async function uploadGoogleDriveFile(params: {
  connectorId: string;
  name: string;
  mimeType: string;
  parentId?: string;
  content: string;
}): Promise<DriveFile> {
  const accessToken = await getValidAccessToken(params.connectorId);
  const boundary = `openbeam_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const metadata: Record<string, unknown> = {
    name: params.name,
    mimeType: params.mimeType,
    ...(params.parentId ? { parents: [params.parentId] } : {}),
  };
  const bodyParts = [
    `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${params.mimeType}\r\n\r\n` +
      `${params.content}\r\n` +
      `--${boundary}--`,
  ];
  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: bodyParts.join(""),
    }
  );
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as {
      error?: { message?: string; code?: number; status?: string };
    };
    throw GoogleDriveApiError.fromResponse(response.status, errorBody);
  }
  const json = (await response.json()) as DriveFile;
  const parsed = DriveFileSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Google Drive upload response invalid");
  }
  return parsed.data;
}

async function executeGoogleDriveAction(params: {
  actionId: string;
  inputs: Record<string, unknown>;
  connectorId: string;
  connectorConfig: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const userEmail =
    typeof params.connectorConfig.userEmail === "string"
      ? params.connectorConfig.userEmail
      : undefined;
  const client = createGoogleDriveClient({
    connectorId: params.connectorId,
    userEmail,
  });

  switch (params.actionId) {
    case "file_get": {
      const fileId = ensureString(params.inputs.fileId, "File ID");
      const fields =
        typeof params.inputs.fields === "string" && params.inputs.fields.trim()
          ? params.inputs.fields.trim()
          : undefined;
      const file = await getFile(client, fileId, {
        fields: fields ?? "id,name,mimeType,webViewLink",
      });
      if (!file) {
        throw new Error("File not found");
      }
      return {
        id: file.id,
        name: file.name ?? "",
        mimeType: file.mimeType ?? "",
        webViewLink: file.webViewLink ?? "",
      };
    }
    case "file_search": {
      const query = ensureString(params.inputs.query, "Query");
      const pageSize =
        typeof params.inputs.pageSize === "number"
          ? params.inputs.pageSize
          : undefined;
      const orderBy =
        typeof params.inputs.orderBy === "string"
          ? params.inputs.orderBy
          : undefined;
      const response = await client.get<unknown>("/files", {
        q: query,
        pageSize,
        orderBy,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: "nextPageToken,files(id,name,mimeType,webViewLink)",
      });
      const parsed = DriveFileListResponseSchema.safeParse(response);
      if (!parsed.success) {
        throw new Error("Drive search failed");
      }
      return {
        files: parsed.data.files ?? [],
        nextPageToken: parsed.data.nextPageToken ?? "",
      };
    }
    case "file_create": {
      const name = ensureString(params.inputs.name, "Name");
      const mimeType =
        typeof params.inputs.mimeType === "string" &&
        params.inputs.mimeType.trim()
          ? params.inputs.mimeType.trim()
          : "text/plain";
      const parentId =
        typeof params.inputs.parentId === "string"
          ? params.inputs.parentId
          : undefined;
      const content =
        typeof params.inputs.content === "string"
          ? params.inputs.content
          : undefined;
      const file = content
        ? await uploadGoogleDriveFile({
            connectorId: params.connectorId,
            name,
            mimeType,
            parentId,
            content,
          })
        : await createFile(client, {
            name,
            mimeType,
            parents: parentId ? [parentId] : undefined,
          }).then(async (result) => {
            if (!(result.success && result.fileId)) {
              throw new Error(result.error ?? "Drive file creation failed");
            }
            const created = await getFile(client, result.fileId);
            if (!created) {
              throw new Error("Drive file not found after creation");
            }
            return created;
          });
      return {
        id: file.id,
        webViewLink: file.webViewLink ?? "",
      };
    }
    case "file_copy": {
      const fileId = ensureString(params.inputs.fileId, "File ID");
      const result = await copyFile(client, fileId, {
        name:
          typeof params.inputs.name === "string"
            ? params.inputs.name
            : undefined,
        parents: params.inputs.parentId
          ? [ensureString(params.inputs.parentId, "Parent")]
          : undefined,
      });
      if (!(result.success && result.fileId)) {
        throw new Error(result.error ?? "Drive file copy failed");
      }
      const file = await getFile(client, result.fileId);
      return {
        id: result.fileId,
        name: file?.name ?? "",
      };
    }
    case "file_move": {
      const fileId = ensureString(params.inputs.fileId, "File ID");
      const destinationId = ensureString(
        params.inputs.destinationId,
        "Destination Folder"
      );
      const file = await getFile(client, fileId, { fields: "parents" });
      const parents = file?.parents ?? [];
      const result = await moveFile(client, fileId, {
        addParents: [destinationId],
        removeParents: parents,
      });
      if (!result.success) {
        throw new Error(result.error ?? "Drive move failed");
      }
      return { id: result.fileId ?? fileId, parents: [destinationId] };
    }
    case "file_rename": {
      const fileId = ensureString(params.inputs.fileId, "File ID");
      const name = ensureString(params.inputs.name, "Name");
      const result = await renameFile(client, fileId, name);
      if (!result.success) {
        throw new Error(result.error ?? "Drive rename failed");
      }
      return { id: result.fileId ?? fileId, name };
    }
    case "file_delete": {
      const fileId = ensureString(params.inputs.fileId, "File ID");
      const result = await deleteFile(client, fileId);
      if (!result.success) {
        throw new Error(result.error ?? "Drive delete failed");
      }
      return { ok: true };
    }
    case "permission_create": {
      const fileId = ensureString(params.inputs.fileId, "File ID");
      const email = ensureString(params.inputs.email, "Email");
      const role = ensureString(params.inputs.role, "Role") as
        | "reader"
        | "commenter"
        | "writer";
      const sendNotification =
        typeof params.inputs.sendNotification === "boolean"
          ? params.inputs.sendNotification
          : undefined;
      const result = await shareWithUser(client, fileId, {
        email,
        role,
        sendNotification,
      });
      if (!result.success) {
        throw new Error(result.error ?? "Drive share failed");
      }
      return { id: result.permissionId ?? "", role };
    }
    case "permission_remove": {
      const fileId = ensureString(params.inputs.fileId, "File ID");
      const permissionId = ensureString(
        params.inputs.permissionId,
        "Permission ID"
      );
      const result = await revokeAccess(client, fileId, permissionId);
      if (!result.success) {
        throw new Error(result.error ?? "Drive revoke failed");
      }
      return { ok: true };
    }
    case "folder_create": {
      const name = ensureString(params.inputs.name, "Name");
      const parentId =
        typeof params.inputs.parentId === "string"
          ? params.inputs.parentId
          : undefined;
      const result = await createFolder(client, {
        name,
        parents: parentId ? [parentId] : undefined,
      });
      if (!(result.success && result.folderId)) {
        throw new Error(result.error ?? "Drive folder create failed");
      }
      const folder = await getFile(client, result.folderId);
      return { id: result.folderId, webViewLink: folder?.webViewLink ?? "" };
    }
    default:
      throw new Error(`Unsupported Google Drive action: ${params.actionId}`);
  }
}

const LINEAR_ISSUE_CREATE = `
  mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        url
      }
    }
  }
`;

const LINEAR_ISSUE_UPDATE = `
  mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue {
        id
        identifier
        url
        assignee { id name displayName }
        labels { nodes { id } }
      }
    }
  }
`;

const LINEAR_COMMENT_CREATE = `
  mutation CommentCreate($input: CommentCreateInput!) {
    commentCreate(input: $input) {
      success
      comment {
        id
        url
      }
    }
  }
`;

const LINEAR_PROJECT_CREATE = `
  mutation ProjectCreate($input: ProjectCreateInput!) {
    projectCreate(input: $input) {
      success
      project { id url name }
    }
  }
`;

const LINEAR_ISSUE_SEARCH = `
  query IssueSearch($first: Int!, $filter: IssueFilter) {
    issues(first: $first, filter: $filter, orderBy: updatedAt) {
      nodes { id identifier title url }
      totalCount
    }
  }
`;

async function executeLinearAction(params: {
  actionId: string;
  inputs: Record<string, unknown>;
  connectorId: string;
}): Promise<Record<string, unknown>> {
  const client = createLinearClient({ connectorId: params.connectorId });

  switch (params.actionId) {
    case "issue_create": {
      const input: Record<string, unknown> = {
        teamId: ensureString(params.inputs.teamId, "Team"),
        title: ensureString(params.inputs.title, "Title"),
      };
      if (typeof params.inputs.description === "string") {
        input.description = params.inputs.description;
      }
      if (typeof params.inputs.priority === "number") {
        input.priority = params.inputs.priority;
      }
      if (typeof params.inputs.assigneeId === "string") {
        input.assigneeId = params.inputs.assigneeId;
      }
      if (Array.isArray(params.inputs.labelIds)) {
        input.labelIds = params.inputs.labelIds;
      }
      if (typeof params.inputs.stateId === "string") {
        input.stateId = params.inputs.stateId;
      }
      if (typeof params.inputs.projectId === "string") {
        input.projectId = params.inputs.projectId;
      }
      if (typeof params.inputs.estimate === "number") {
        input.estimate = params.inputs.estimate;
      }
      const response = await client.mutation<{
        issueCreate: {
          success: boolean;
          issue?: { id: string; identifier: string; url: string };
        };
      }>(LINEAR_ISSUE_CREATE, { input });
      if (!(response.issueCreate?.success && response.issueCreate.issue)) {
        throw new Error("Linear issue creation failed");
      }
      return {
        id: response.issueCreate.issue.id,
        identifier: response.issueCreate.issue.identifier,
        url: response.issueCreate.issue.url,
      };
    }
    case "issue_update": {
      const issueId = ensureString(params.inputs.issueId, "Issue ID");
      const input: Record<string, unknown> = {};
      if (typeof params.inputs.title === "string") {
        input.title = params.inputs.title;
      }
      if (typeof params.inputs.description === "string") {
        input.description = params.inputs.description;
      }
      if (typeof params.inputs.stateId === "string") {
        input.stateId = params.inputs.stateId;
      }
      if (typeof params.inputs.priority === "number") {
        input.priority = params.inputs.priority;
      }
      if (typeof params.inputs.assigneeId === "string") {
        input.assigneeId = params.inputs.assigneeId;
      }
      const response = await client.mutation<{
        issueUpdate: {
          success: boolean;
          issue?: { id: string; identifier: string };
        };
      }>(LINEAR_ISSUE_UPDATE, { id: issueId, input });
      if (!(response.issueUpdate?.success && response.issueUpdate.issue)) {
        throw new Error("Linear issue update failed");
      }
      return {
        id: response.issueUpdate.issue.id,
        identifier: response.issueUpdate.issue.identifier,
      };
    }
    case "issue_search": {
      const query = ensureString(params.inputs.query, "Query");
      const filter: Record<string, unknown> = {
        title: { containsIgnoreCase: query },
      };
      if (typeof params.inputs.teamId === "string") {
        filter.team = { id: { eq: params.inputs.teamId } };
      }
      if (typeof params.inputs.assigneeId === "string") {
        filter.assignee = { id: { eq: params.inputs.assigneeId } };
      }
      const limit =
        typeof params.inputs.limit === "number" ? params.inputs.limit : 50;
      const response = await client.query<{
        issues: {
          nodes: Array<{
            id: string;
            identifier: string;
            title: string;
            url: string;
          }>;
          totalCount: number;
        };
      }>(LINEAR_ISSUE_SEARCH, { first: Math.min(limit, 250), filter });
      return {
        issues: response.issues.nodes,
        totalCount: response.issues.totalCount ?? response.issues.nodes.length,
      };
    }
    case "issue_assign": {
      const issueId = ensureString(params.inputs.issueId, "Issue ID");
      const assigneeId = ensureString(params.inputs.assigneeId, "Assignee");
      const response = await client.mutation<{
        issueUpdate: {
          success: boolean;
          issue?: {
            id: string;
            assignee?: { name?: string; displayName?: string };
          };
        };
      }>(LINEAR_ISSUE_UPDATE, { id: issueId, input: { assigneeId } });
      if (!(response.issueUpdate?.success && response.issueUpdate.issue)) {
        throw new Error("Linear assign failed");
      }
      const name =
        response.issueUpdate.issue.assignee?.displayName ??
        response.issueUpdate.issue.assignee?.name ??
        "";
      return { id: response.issueUpdate.issue.id, assignee: name };
    }
    case "issue_add_comment": {
      const issueId = ensureString(params.inputs.issueId, "Issue ID");
      const body = ensureString(params.inputs.body, "Body");
      const response = await client.mutation<{
        commentCreate: {
          success: boolean;
          comment?: { id: string; url: string };
        };
      }>(LINEAR_COMMENT_CREATE, { input: { issueId, body } });
      if (
        !(response.commentCreate?.success && response.commentCreate.comment)
      ) {
        throw new Error("Linear comment failed");
      }
      return {
        id: response.commentCreate.comment.id,
        url: response.commentCreate.comment.url,
      };
    }
    case "issue_add_label": {
      const issueId = ensureString(params.inputs.issueId, "Issue ID");
      const labelId = ensureString(params.inputs.labelId, "Label ID");
      const issue = await getIssue(client, issueId);
      const existing = issue.labels.nodes.map((label) => label.id);
      const labelIds = uniqueExact([...existing, labelId]);
      const response = await client.mutation<{
        issueUpdate: { success: boolean; issue?: { id: string } };
      }>(LINEAR_ISSUE_UPDATE, { id: issueId, input: { labelIds } });
      if (!(response.issueUpdate?.success && response.issueUpdate.issue)) {
        throw new Error("Linear label update failed");
      }
      return { id: response.issueUpdate.issue.id };
    }
    case "project_get": {
      const projectId = ensureString(params.inputs.projectId, "Project ID");
      const project = await getProject(client, projectId);
      return {
        id: project.id,
        name: project.name ?? "",
        state: project.state ?? "",
        progress: project.progress ?? 0,
      };
    }
    case "project_create": {
      const name = ensureString(params.inputs.name, "Name");
      const teamIds = Array.isArray(params.inputs.teamIds)
        ? params.inputs.teamIds
        : parseJsonValue(params.inputs.teamIds, "Teams");
      if (!Array.isArray(teamIds) || teamIds.length === 0) {
        throw new Error("Teams are required");
      }
      const input: Record<string, unknown> = {
        name,
        teamIds,
      };
      if (typeof params.inputs.description === "string") {
        input.description = params.inputs.description;
      }
      if (typeof params.inputs.targetDate === "string") {
        input.targetDate = params.inputs.targetDate;
      }
      const response = await client.mutation<{
        projectCreate: {
          success: boolean;
          project?: { id: string; url: string };
        };
      }>(LINEAR_PROJECT_CREATE, { input });
      if (
        !(response.projectCreate?.success && response.projectCreate.project)
      ) {
        throw new Error("Linear project create failed");
      }
      return {
        id: response.projectCreate.project.id,
        url: response.projectCreate.project.url,
      };
    }
    case "cycle_get": {
      const teamId = ensureString(params.inputs.teamId, "Team ID");
      const cycleId =
        typeof params.inputs.cycleId === "string"
          ? params.inputs.cycleId
          : undefined;
      if (cycleId) {
        const cycle = await getCycle(client, cycleId);
        return {
          id: cycle.id,
          name: cycle.name ?? "",
          startsAt: cycle.startsAt,
          endsAt: cycle.endsAt,
          progress: cycle.progress,
        };
      }
      const { cycles } = await getTeamCycles(client, { teamId });
      const now = Date.now();
      const active =
        cycles.find((cycle) => {
          const start = Date.parse(cycle.startsAt);
          const end = Date.parse(cycle.endsAt);
          return now >= start && now <= end;
        }) ??
        cycles.sort(
          (a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt)
        )[0];
      if (!active) {
        throw new Error("No cycle found");
      }
      return {
        id: active.id,
        name: active.name ?? "",
        startsAt: active.startsAt,
        endsAt: active.endsAt,
        progress: active.progress,
      };
    }
    case "cycle_add_issue": {
      const cycleId = ensureString(params.inputs.cycleId, "Cycle ID");
      const issueId = ensureString(params.inputs.issueId, "Issue ID");
      const response = await client.mutation<{
        issueUpdate: { success: boolean; issue?: { id: string } };
      }>(LINEAR_ISSUE_UPDATE, { id: issueId, input: { cycleId } });
      if (!(response.issueUpdate?.success && response.issueUpdate.issue)) {
        throw new Error("Linear cycle update failed");
      }
      return { id: response.issueUpdate.issue.id };
    }
    default:
      throw new Error(`Unsupported Linear action: ${params.actionId}`);
  }
}

export async function executeConnectorAction(params: {
  connectorType: string;
  actionId: string;
  inputs: Record<string, unknown>;
  connectorId: string;
  connectorConfig: Record<string, unknown>;
  timeoutMs: number;
}): Promise<Record<string, unknown>> {
  switch (params.connectorType) {
    case "slack":
      return await executeSlackAction(params);
    case "gmail":
      return await executeGmailAction(params);
    case "notion":
      return await executeNotionAction(params);
    case "google_drive":
      return await executeGoogleDriveAction(params);
    case "linear":
      return await executeLinearAction(params);
    default:
      throw new Error(`Unsupported connector type: ${params.connectorType}`);
  }
}

export const connectorActionExecutor: CanvasNodeExecutor = async ({
  node,
  input,
  context,
}) => {
  let config: ConnectorActionNodeConfig | null = null;

  try {
    const parsedConfig = ConnectorActionNodeConfigSchema.parse(
      resolveNodeConfig(node.data)
    );
    config = parsedConfig;

    const connectorType = parsedConfig.connectorType.trim();
    const connectorId = parsedConfig.connectorId?.trim();
    const actionId = parsedConfig.actionId.trim();

    if (!connectorType) {
      throw new Error("Connector type is required");
    }
    if (!connectorId) {
      throw new Error("Connector ID is required");
    }
    if (!actionId) {
      throw new Error("Action ID is required");
    }
    if (!context) {
      throw new Error("Execution context is required");
    }

    ensureRegistriesReady();

    const normalizedType = normalizeConnectorType(connectorType);
    const connector = await verifyConnectorOwnership(
      prisma,
      connectorId,
      context.teamId
    );

    if (!connector) {
      throw new Error("Connector not found or unauthorized");
    }

    const expectedType = normalizeToConnectorType(connector.app);
    if (
      expectedType &&
      normalizeConnectorType(expectedType) !== normalizedType
    ) {
      throw new Error(
        `Connector type mismatch: expected ${expectedType}, got ${normalizedType}`
      );
    }

    const action = getActionDefinition(normalizedType, actionId);
    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    const connectorRecord = await getConnectorWithCredentials(
      prisma,
      connectorId
    );
    const connectorConfig =
      connectorRecord && isRecord(connectorRecord.config)
        ? connectorRecord.config
        : {};

    const inputs = buildActionInputs({
      action,
      config: parsedConfig,
      input,
      context,
      node,
    });

    const timeoutMs = parsedConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const { result, retryCount, durationMs } = await executeWithRetry({
      execute: async () =>
        await executeConnectorAction({
          connectorType: normalizedType,
          actionId,
          inputs,
          connectorId,
          connectorConfig,
          timeoutMs,
        }),
      retryConfig: parsedConfig.retryConfig,
      timeoutMs,
    });

    const payload: ConnectorActionExecuteResult = {
      success: true,
      data: sanitizeOutput(result),
      metrics: { durationMs, retryCount },
    };

    return ConnectorActionExecuteResultSchema.parse(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const actionError = toActionError(error);

    if (config?.continueOnError) {
      const payload: ConnectorActionExecuteResult = {
        success: false,
        error: actionError,
        metrics: { durationMs: 0 },
      };
      return ConnectorActionExecuteResultSchema.parse(payload);
    }

    throw new CanvasNodeExecutionError({
      nodeType: node.type,
      nodeId: node.id,
      message,
      cause: error,
    });
  }
};
