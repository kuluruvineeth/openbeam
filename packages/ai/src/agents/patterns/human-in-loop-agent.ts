import type { AgentStreamChunk, ExecutableAgent } from "../base";
import {
  aggregateTokens,
  calculateDuration,
  completeTrace,
  failTrace,
} from "../base";
import type {
  AgentExecutionContext,
  AgentExecutionResult,
  AgentState,
  ExecutionTrace,
  LlmAgentConfig,
} from "../config";
import { setStateValue } from "../config";
import { createAgentFromConfig } from "./factory";

export interface ApprovalRequest {
  id: string;
  agentName: string;
  toolName: string;
  toolInput: unknown;
  userId: string;
  teamId: string;
  timestamp: number;
  expiresAt: number;
  metadata?: Record<string, unknown>;
}

export interface ApprovalResponse {
  approved: boolean;
  approvedBy?: string;
  reason?: string;
  modifiedInput?: unknown;
  timestamp: number;
}

export interface ApprovalHandler {
  request(req: ApprovalRequest): Promise<ApprovalResponse>;
  cancel?(requestId: string): Promise<void>;
}

export interface HumanInLoopConfig {
  type?: "human-in-loop";
  name: string;
  description?: string;
  innerAgent: LlmAgentConfig;
  approvalRequired: ApprovalRequiredFn | ApprovalRequiredConfig;
  approvalHandler: ApprovalHandler;
  approvalTimeoutMs?: number;
  onApprovalTimeout?: "reject" | "skip" | "error";
  state?: {
    outputKey?: string;
    inputRefs?: string[];
  };
}

export type ApprovalRequiredFn = (toolCall: PendingToolCall) => boolean;

export interface ApprovalRequiredConfig {
  tools?: string[];
  patterns?: string[];
  always?: boolean;
}

export interface PendingToolCall {
  toolName: string;
  toolInput: unknown;
  toolCallId: string;
}

export class ApprovalDeniedError extends Error {
  readonly toolCall: PendingToolCall;
  readonly reason?: string;

  constructor(toolCall: PendingToolCall, reason?: string) {
    super(`Approval denied for tool: ${toolCall.toolName}`);
    this.name = "ApprovalDeniedError";
    this.toolCall = toolCall;
    this.reason = reason;
  }
}

export class ApprovalTimeoutError extends Error {
  readonly toolCall: PendingToolCall;
  readonly timeoutMs: number;

  constructor(toolCall: PendingToolCall, timeoutMs: number) {
    super(
      `Approval timed out after ${timeoutMs}ms for tool: ${toolCall.toolName}`
    );
    this.name = "ApprovalTimeoutError";
    this.toolCall = toolCall;
    this.timeoutMs = timeoutMs;
  }
}

const DEFAULT_APPROVAL_TIMEOUT_MS = 300_000;

export class HumanInLoopAgent implements ExecutableAgent {
  readonly config: LlmAgentConfig;
  private readonly hilConfig: HumanInLoopConfig;
  private readonly pendingApprovals = new Map<string, AbortController>();

  constructor(config: HumanInLoopConfig) {
    this.hilConfig = config;
    this.config = config.innerAgent;
  }

  async execute(
    input: unknown,
    ctx: AgentExecutionContext
  ): Promise<AgentExecutionResult> {
    const trace = this.createHILTrace(ctx.parentTrace);
    trace.input = input;

    try {
      const innerAgent = createAgentFromConfig(this.hilConfig.innerAgent);
      const wrappedCtx = this.wrapContextWithApproval(ctx);

      const result = await innerAgent.execute(input, {
        ...wrappedCtx,
        parentTrace: trace,
      });

      this.persistOutput(ctx.state, result.output);
      completeTrace(trace, result.output, result.totalTokens);

      return this.buildResult(result.output, ctx.state, trace);
    } catch (error) {
      if (error instanceof ApprovalDeniedError) {
        const deniedOutput = {
          error: "approval_denied",
          toolName: error.toolCall.toolName,
          reason: error.reason ?? "User denied the action",
        };
        completeTrace(trace, deniedOutput);
        return this.buildResult(deniedOutput, ctx.state, trace);
      }

      if (error instanceof ApprovalTimeoutError) {
        const timeoutAction = this.hilConfig.onApprovalTimeout ?? "error";

        if (timeoutAction === "error") {
          failTrace(trace, error);
          throw error;
        }

        const timeoutOutput = {
          error: "approval_timeout",
          toolName: error.toolCall.toolName,
          action: timeoutAction,
        };
        completeTrace(trace, timeoutOutput);
        return this.buildResult(timeoutOutput, ctx.state, trace);
      }

      failTrace(trace, error as Error);
      throw error;
    } finally {
      this.cancelPendingApprovals();
    }
  }

  async *stream(
    input: unknown,
    ctx: AgentExecutionContext
  ): AsyncGenerator<AgentStreamChunk> {
    const trace = this.createHILTrace(ctx.parentTrace);
    trace.input = input;

    try {
      const innerAgent = createAgentFromConfig(this.hilConfig.innerAgent);
      const wrappedCtx = this.wrapContextWithApproval(ctx);

      if (!innerAgent.stream) {
        const result = await innerAgent.execute(input, {
          ...wrappedCtx,
          parentTrace: trace,
        });

        this.persistOutput(ctx.state, result.output);
        completeTrace(trace, result.output, result.totalTokens);

        yield {
          type: "done",
          agentName: this.hilConfig.name,
          result: this.buildResult(result.output, ctx.state, trace),
        };
        return;
      }

      let finalOutput: unknown;

      for await (const chunk of innerAgent.stream(input, {
        ...wrappedCtx,
        parentTrace: trace,
      })) {
        if (chunk.type === "tool-call") {
          const toolCall: PendingToolCall = {
            toolName: chunk.toolName ?? "",
            toolInput: chunk.toolInput,
            toolCallId: chunk.toolCallId ?? "",
          };

          if (this.requiresApproval(toolCall)) {
            yield {
              type: "step",
              agentName: this.hilConfig.name,
              content: `Awaiting approval for: ${toolCall.toolName}`,
            };
          }
        }

        yield {
          ...chunk,
          agentName: `${this.hilConfig.name}/${chunk.agentName}`,
        };

        if (chunk.type === "done" && chunk.result) {
          finalOutput = chunk.result.output;
        }
      }

      this.persistOutput(ctx.state, finalOutput);
      completeTrace(trace, finalOutput);

      yield {
        type: "done",
        agentName: this.hilConfig.name,
        result: this.buildResult(finalOutput, ctx.state, trace),
      };
    } catch (error) {
      if (error instanceof ApprovalDeniedError) {
        const deniedOutput = {
          error: "approval_denied",
          toolName: error.toolCall.toolName,
          reason: error.reason,
        };

        yield {
          type: "step",
          agentName: this.hilConfig.name,
          content: `Approval denied for: ${error.toolCall.toolName}`,
        };

        completeTrace(trace, deniedOutput);

        yield {
          type: "done",
          agentName: this.hilConfig.name,
          result: this.buildResult(deniedOutput, ctx.state, trace),
        };
        return;
      }

      failTrace(trace, error as Error);
      throw error;
    } finally {
      this.cancelPendingApprovals();
    }
  }

  private createHILTrace(parentTrace?: ExecutionTrace): ExecutionTrace {
    const trace: ExecutionTrace = {
      agentName: this.hilConfig.name,
      type: "llm",
      startTime: Date.now(),
      status: "running",
      children: [],
    };

    if (parentTrace) {
      parentTrace.children.push(trace);
    }

    return trace;
  }

  private wrapContextWithApproval(
    ctx: AgentExecutionContext
  ): AgentExecutionContext {
    const originalMetadata = ctx.metadata ?? {};

    return {
      ...ctx,
      metadata: {
        ...originalMetadata,
        __humanInLoopAgent: this,
        __approvalCheck: (toolCall: PendingToolCall) => {
          if (!this.requiresApproval(toolCall)) {
            return Promise.resolve({ approved: true });
          }

          return this.requestApproval(toolCall, ctx);
        },
      },
    };
  }

  private requiresApproval(toolCall: PendingToolCall): boolean {
    const config = this.hilConfig.approvalRequired;

    if (typeof config === "function") {
      return config(toolCall);
    }

    if (config.always) {
      return true;
    }

    if (config.tools?.includes(toolCall.toolName)) {
      return true;
    }

    if (config.patterns) {
      for (const pattern of config.patterns) {
        try {
          const regex = new RegExp(pattern, "i");
          if (regex.test(toolCall.toolName)) {
            return true;
          }
        } catch {
          if (toolCall.toolName.includes(pattern)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private async requestApproval(
    toolCall: PendingToolCall,
    ctx: AgentExecutionContext
  ): Promise<ApprovalResponse> {
    const timeoutMs =
      this.hilConfig.approvalTimeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS;
    const requestId = `approval_${Date.now()}_${toolCall.toolCallId}`;

    const request: ApprovalRequest = {
      id: requestId,
      agentName: this.hilConfig.name,
      toolName: toolCall.toolName,
      toolInput: toolCall.toolInput,
      userId: ctx.userId,
      teamId: ctx.teamId,
      timestamp: Date.now(),
      expiresAt: Date.now() + timeoutMs,
      metadata: ctx.metadata,
    };

    const abortController = new AbortController();
    this.pendingApprovals.set(requestId, abortController);

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new ApprovalTimeoutError(toolCall, timeoutMs));
        }, timeoutMs);

        abortController.signal.addEventListener("abort", () => {
          clearTimeout(timeoutId);
          reject(new Error("Approval cancelled"));
        });
      });

      const response = await Promise.race([
        this.hilConfig.approvalHandler.request(request),
        timeoutPromise,
      ]);

      if (!response.approved) {
        throw new ApprovalDeniedError(toolCall, response.reason);
      }

      return response;
    } finally {
      this.pendingApprovals.delete(requestId);
    }
  }

  private cancelPendingApprovals(): void {
    for (const [requestId, controller] of this.pendingApprovals) {
      controller.abort();
      this.hilConfig.approvalHandler.cancel?.(requestId);
    }
    this.pendingApprovals.clear();
  }

  private persistOutput(state: AgentState, output: unknown): void {
    const outputKey = this.hilConfig.state?.outputKey ?? this.hilConfig.name;
    setStateValue(state, this.hilConfig.name, outputKey, output);
  }

  private buildResult(
    output: unknown,
    state: AgentState,
    trace: ExecutionTrace
  ): AgentExecutionResult {
    const tokens = aggregateTokens([trace]);
    return {
      output,
      state,
      trace,
      finishReason: trace.status === "completed" ? "stop" : "error",
      totalTokens: tokens,
      durationMs: calculateDuration(trace),
    };
  }
}

export function createHumanInLoopAgent(
  config: HumanInLoopConfig
): HumanInLoopAgent {
  return new HumanInLoopAgent(config);
}

export function isHumanInLoopConfig(
  config: unknown
): config is HumanInLoopConfig {
  return (
    typeof config === "object" &&
    config !== null &&
    "innerAgent" in config &&
    "approvalHandler" in config
  );
}

export function createSlackApprovalHandler(options: {
  webhookUrl: string;
  channel: string;
}): ApprovalHandler {
  const pendingRequests = new Map<
    string,
    { resolve: (response: ApprovalResponse) => void }
  >();

  return {
    request(req: ApprovalRequest): Promise<ApprovalResponse> {
      return new Promise((resolve) => {
        pendingRequests.set(req.id, { resolve });

        fetch(options.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: options.channel,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*Approval Required*\nAgent: ${req.agentName}\nTool: ${req.toolName}`,
                },
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `\`\`\`${JSON.stringify(req.toolInput, null, 2)}\`\`\``,
                },
              },
              {
                type: "actions",
                elements: [
                  {
                    type: "button",
                    text: { type: "plain_text", text: "Approve" },
                    style: "primary",
                    action_id: `approve_${req.id}`,
                  },
                  {
                    type: "button",
                    text: { type: "plain_text", text: "Deny" },
                    style: "danger",
                    action_id: `deny_${req.id}`,
                  },
                ],
              },
            ],
          }),
        }).catch(() => {
          resolve({
            approved: false,
            reason: "Failed to send approval request",
            timestamp: Date.now(),
          });
        });
      });
    },

    cancel(requestId: string): Promise<void> {
      const pending = pendingRequests.get(requestId);
      if (pending) {
        pending.resolve({
          approved: false,
          reason: "Request cancelled",
          timestamp: Date.now(),
        });
        pendingRequests.delete(requestId);
      }
      return Promise.resolve();
    },
  };
}

export function createInMemoryApprovalHandler(): ApprovalHandler & {
  approve(requestId: string, approvedBy?: string): void;
  deny(requestId: string, reason?: string): void;
  getPendingRequests(): ApprovalRequest[];
} {
  const pendingRequests = new Map<
    string,
    {
      request: ApprovalRequest;
      resolve: (response: ApprovalResponse) => void;
    }
  >();

  return {
    request(req: ApprovalRequest): Promise<ApprovalResponse> {
      return new Promise((resolve) => {
        pendingRequests.set(req.id, { request: req, resolve });
      });
    },

    cancel(requestId: string): Promise<void> {
      const pending = pendingRequests.get(requestId);
      if (pending) {
        pending.resolve({
          approved: false,
          reason: "Request cancelled",
          timestamp: Date.now(),
        });
        pendingRequests.delete(requestId);
      }
      return Promise.resolve();
    },

    approve(requestId: string, approvedBy?: string): void {
      const pending = pendingRequests.get(requestId);
      if (pending) {
        pending.resolve({
          approved: true,
          approvedBy,
          timestamp: Date.now(),
        });
        pendingRequests.delete(requestId);
      }
    },

    deny(requestId: string, reason?: string): void {
      const pending = pendingRequests.get(requestId);
      if (pending) {
        pending.resolve({
          approved: false,
          reason,
          timestamp: Date.now(),
        });
        pendingRequests.delete(requestId);
      }
    },

    getPendingRequests(): ApprovalRequest[] {
      return Array.from(pendingRequests.values()).map((p) => p.request);
    },
  };
}
