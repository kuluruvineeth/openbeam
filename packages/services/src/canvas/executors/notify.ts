import prisma, {
  AppType,
  findLatestActiveConnectorByTeamAndApp,
} from "@openbeam/db";
import type { NotifyChannel } from "@openbeam/types/canvas";
import { NotifyNodeConfigSchema } from "@openbeam/types/canvas";
import jmespath from "jmespath";
import mustache from "mustache";
import { sendEmail } from "../../gmail/actions/send-email";
import { createGmailClient } from "../../gmail/client";
import { getValidAccessToken } from "../../lib/token-refresh";
import {
  type SendMessageResult,
  sendMessage,
} from "../../slack/actions/send-message";
import { createSlackClient } from "../../slack/client";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

const VARIABLE_REF = /{{\s*([^}]+)\s*}}/;

type NotifyChannelResult = {
  channel: NotifyChannel;
  success: boolean;
  error?: string;
  details?: Record<string, unknown>;
};

type NotifyExecutionResult = {
  success: boolean;
  results: NotifyChannelResult[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

function resolveExpressionValue(
  value: string,
  input: unknown,
  context: Record<string, unknown> | undefined,
  node: { id: string; type: string }
): unknown {
  const expression = normalizeVariableRef(value);
  if (!expression) {
    return value;
  }
  const direct = resolvePath(input, expression);
  if (direct !== undefined) {
    return direct;
  }
  return resolvePath({ input, context, node }, expression);
}

function parseRecipientValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => parseRecipientValues(item))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (value === undefined || value === null) {
    return [];
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
}

function uniqueRecipients(values: string[]): string[] {
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

function buildTemplateContext(params: {
  input: unknown;
  includeContext: boolean;
  executionContext?: Record<string, unknown>;
}): Record<string, unknown> {
  const base: Record<string, unknown> = {
    input: params.input,
    data: params.input,
  };

  if (Array.isArray(params.input)) {
    base.items = params.input;
  } else if (!isRecord(params.input)) {
    base.value = params.input;
  }

  if (params.includeContext && params.executionContext) {
    const execution = params.executionContext;
    base.context = execution;
    base.workflow = {
      id: execution.agentCanvasId,
      executionId: execution.executionId,
      version: execution.versionNumber,
      triggerSource: execution.triggerSource,
    };
    base.trigger = {
      source: execution.triggerSource,
      userId: execution.triggeredById,
    };
  }

  return base;
}

function renderTemplate(template: string, context: Record<string, unknown>) {
  return mustache.render(template, context);
}

function defaultBody(input: unknown): string {
  if (input === undefined || input === null) {
    return "";
  }
  if (typeof input === "string") {
    return input;
  }
  if (typeof input === "number" || typeof input === "boolean") {
    return String(input);
  }
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

async function findActiveConnector(
  teamId: string,
  app: AppType
): Promise<{
  id: string;
  config: unknown;
}> {
  const connector = await findLatestActiveConnectorByTeamAndApp(
    prisma,
    teamId,
    app
  );

  if (!connector) {
    throw new Error(`No active ${app} connector found`);
  }

  return connector;
}

function normalizeWebhookHeaders(
  headers: Record<string, string> | undefined
): Record<string, string> {
  return headers ? { ...headers } : {};
}

async function sendWebhookNotification(params: {
  url: string;
  headers?: Record<string, string>;
  payload: Record<string, unknown>;
}): Promise<NotifyChannelResult> {
  const headers = normalizeWebhookHeaders(params.headers);
  if (!headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(params.url, {
    method: "POST",
    headers,
    body: JSON.stringify(params.payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed with status ${response.status}`);
  }

  return {
    channel: "webhook",
    success: true,
    details: { status: response.status },
  };
}

async function sendEmailNotification(params: {
  teamId: string;
  to: string[];
  subject: string;
  body: string;
  isHtml: boolean;
}): Promise<NotifyChannelResult> {
  const connector = await findActiveConnector(params.teamId, AppType.GMAIL);
  const accessToken = await getValidAccessToken(connector.id);
  const config = isRecord(connector.config) ? connector.config : {};
  const userEmail =
    typeof config.userEmail === "string" ? config.userEmail : undefined;
  const client = createGmailClient({
    connectorId: connector.id,
    accessToken,
    userEmail,
  });

  const result = await sendEmail(client, {
    to: params.to,
    subject: params.subject,
    body: params.body,
    isHtml: params.isHtml,
  });

  if (!result.success) {
    throw new Error(result.error ?? "Failed to send email");
  }

  return {
    channel: "email",
    success: true,
    details: {
      messageId: result.messageId,
      threadId: result.threadId,
    },
  };
}

async function sendSlackNotification(params: {
  teamId: string;
  recipients: string[];
  text: string;
  markdown: boolean;
}): Promise<NotifyChannelResult> {
  const connector = await findActiveConnector(params.teamId, AppType.SLACK);
  const token = await getValidAccessToken(connector.id);
  const config = isRecord(connector.config) ? connector.config : {};
  const client = createSlackClient({
    connectorId: connector.id,
    token,
    teamId: typeof config.teamId === "string" ? config.teamId : undefined,
  });

  const results: SendMessageResult[] = [];

  for (const recipient of params.recipients) {
    const result = await sendMessage(client, {
      channel: recipient,
      text: params.text,
      mrkdwn: params.markdown,
    });
    results.push(result);
    if (!result.success) {
      throw new Error(result.error ?? "Failed to send Slack message");
    }
  }

  return {
    channel: "slack",
    success: true,
    details: {
      count: results.length,
      messageTs: results.at(-1)?.messageTs,
    },
  };
}

async function executeWithRetries<T>(
  action: () => Promise<T>,
  attempts: number
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        break;
      }
    }
  }
  throw lastError;
}

function normalizeMessageBody(params: {
  format: string;
  template: string;
  context: Record<string, unknown>;
  input: unknown;
}): string {
  const template = params.template.trim();
  if (!template) {
    if (params.format === "json") {
      return JSON.stringify(params.input, null, 2);
    }
    return defaultBody(params.input);
  }
  return renderTemplate(template, params.context);
}

function normalizeSubject(
  subject: string | undefined,
  context: Record<string, unknown>
): string {
  const raw = subject?.trim() ?? "";
  if (!raw) {
    return "Notification";
  }
  return renderTemplate(raw, context);
}

function normalizeRecipients(params: {
  staticRecipients?: string[];
  expression?: string;
  input: unknown;
  context: Record<string, unknown> | undefined;
  node: { id: string; type: string };
}): string[] {
  const collected = new Set<string>();
  for (const recipient of params.staticRecipients ?? []) {
    if (recipient.trim()) {
      collected.add(recipient.trim());
    }
  }

  if (params.expression?.trim()) {
    const resolved = resolveExpressionValue(
      params.expression,
      params.input,
      params.context,
      params.node
    );
    for (const recipient of parseRecipientValues(resolved)) {
      collected.add(recipient);
    }
  }

  return uniqueRecipients(Array.from(collected));
}

export const notifyExecutor: CanvasNodeExecutor = async ({
  node,
  input,
  context,
}) => {
  const config = NotifyNodeConfigSchema.parse(resolveNodeConfig(node.data));

  try {
    const templateContext = buildTemplateContext({
      input,
      includeContext: config.includeContext,
      executionContext: context as Record<string, unknown> | undefined,
    });

    const recipients = normalizeRecipients({
      staticRecipients: config.recipients,
      expression: config.recipientExpression,
      input,
      context: context as Record<string, unknown> | undefined,
      node: { id: node.id, type: node.type },
    });

    const subject = normalizeSubject(config.subject, templateContext);
    const body = normalizeMessageBody({
      format: config.format,
      template: config.template ?? "",
      context: templateContext,
      input,
    });

    const results: NotifyChannelResult[] = [];
    const attempts = config.retryOnFailure ? Math.max(config.maxRetries, 1) : 1;
    const teamId = context?.teamId;
    const requiresConnector = config.channels.some(
      (channel) => channel === "email" || channel === "slack"
    );

    if (requiresConnector && !teamId) {
      throw new Error("Team context is required for connector notifications");
    }

    for (const channel of config.channels) {
      if (channel === "email") {
        if (recipients.length === 0) {
          throw new Error("Email recipients are required");
        }
        const result = await executeWithRetries(
          () =>
            sendEmailNotification({
              teamId: teamId ?? "",
              to: recipients,
              subject,
              body,
              isHtml: config.format === "html",
            }),
          attempts
        );
        results.push(result);
        continue;
      }

      if (channel === "slack") {
        if (recipients.length === 0) {
          throw new Error("Slack recipients are required");
        }
        const result = await executeWithRetries(
          () =>
            sendSlackNotification({
              teamId: teamId ?? "",
              recipients,
              text: body,
              markdown: config.format === "markdown",
            }),
          attempts
        );
        results.push(result);
        continue;
      }

      if (channel === "webhook") {
        const webhookUrl = config.webhookUrl?.trim();
        if (!webhookUrl) {
          throw new Error("Webhook URL is required");
        }
        const result = await executeWithRetries(
          () =>
            sendWebhookNotification({
              url: webhookUrl,
              headers: config.webhookHeaders,
              payload: {
                channel,
                subject,
                message: body,
                format: config.format,
                priority: config.priority,
                recipients,
                groupKey: config.groupKey,
                input,
                context: config.includeContext ? context : undefined,
              },
            }),
          attempts
        );
        results.push(result);
        continue;
      }

      results.push({
        channel,
        success: false,
        error: `Channel ${channel} is not supported`,
      });
    }

    const failures = results.filter((result) => !result.success);
    if (failures.length > 0) {
      const messages = failures
        .map((failure) => `${failure.channel}: ${failure.error ?? "failed"}`)
        .join(", ");
      throw new Error(`Notification failed: ${messages}`);
    }

    return {
      success: true,
      results,
    } satisfies NotifyExecutionResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CanvasNodeExecutionError({
      nodeType: node.type,
      nodeId: node.id,
      message,
      cause: error,
    });
  }
};
