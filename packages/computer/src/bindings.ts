import { anthropic } from "@ai-sdk/anthropic";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Database } from "@openbeam/db";
import {
  getAgentMemory,
  updateComputerRun,
  upsertAgentMemory,
} from "@openbeam/db";
import type { StepRecord } from "@openbeam/types/computer";
import { generateText } from "ai";
import { AGENT_LIMITS } from "./constants";
import { ProposalSubmittedError } from "./errors";
import { createStepLogger } from "./step-logger";

export type NotifyCallback = (
  teamId: string,
  eventType: string,
  payload: Record<string, unknown>
) => Promise<void>;

interface BindingContext {
  db: Database;
  teamId: string;
  userId: string;
  agentId: string;
  agentName: string;
  agentSlug: string;
  runId: string;
  mcpClient: Client;
  triggerContext?: Record<string, unknown>;
  onNotify?: NotifyCallback;
}

interface ProposedAction {
  tool: string;
  args: Record<string, unknown>;
  description?: string;
}

export function createBindings(ctx: BindingContext) {
  const steps: StepRecord[] = [];
  const stepLogger = createStepLogger(steps);
  let toolCallCount = 0;
  let llmCallCount = 0;

  const bindings = {
    parseMcp(result: unknown): unknown {
      const r = result as {
        structuredContent?: unknown;
        content?: Array<{ text?: string }>;
        isError?: boolean;
      };
      if (r?.isError) {
        const errorText = r?.content?.[0]?.text ?? "Tool returned error";
        throw new Error(errorText);
      }
      if (r?.structuredContent !== undefined) {
        return r.structuredContent;
      }
      const text = r?.content?.[0]?.text;
      if (!text) {
        return null;
      }
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    },

    async callTool(
      name: string,
      args: Record<string, unknown>
    ): Promise<unknown> {
      if (toolCallCount >= AGENT_LIMITS.maxToolCalls) {
        throw new Error(
          `Tool call limit exceeded (max ${AGENT_LIMITS.maxToolCalls})`
        );
      }
      toolCallCount += 1;
      const step = stepLogger.log("tool_call", name, args);
      try {
        const result = await ctx.mcpClient.callTool({
          name,
          arguments: args,
        });
        step.done(result);
        return result;
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Tool call failed";
        step.done({ error: msg });
        throw error;
      }
    },

    async generateLlmText(
      prompt: string,
      opts?: {
        system?: string;
        temperature?: number;
        maxTokens?: number;
        model?: string;
      }
    ): Promise<string> {
      if (llmCallCount >= AGENT_LIMITS.maxLlmCalls) {
        throw new Error(
          `LLM call limit exceeded (max ${AGENT_LIMITS.maxLlmCalls})`
        );
      }
      llmCallCount += 1;
      const step = stepLogger.log("ai_generation", "generateText", {
        promptLength: prompt.length,
        model: opts?.model,
      });
      try {
        const { text } = await generateText({
          model: anthropic(opts?.model ?? "claude-haiku-4-5"),
          system: opts?.system,
          prompt,
          temperature: opts?.temperature,
          maxOutputTokens: opts?.maxTokens,
        });
        step.done({ textLength: text.length });
        return text;
      } catch (error) {
        const msg = error instanceof Error ? error.message : "LLM call failed";
        step.done({ error: msg });
        throw error;
      }
    },

    async readMemory(opts?: {
      key?: string;
      type?: string;
    }): Promise<unknown[]> {
      const step = stepLogger.log("memory_read", "readMemory", opts);
      try {
        const result = await getAgentMemory(
          ctx.db,
          ctx.agentId,
          ctx.teamId,
          opts
        );
        step.done({ count: result.length });
        return result;
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Memory read failed";
        step.done({ error: msg });
        throw error;
      }
    },

    async writeMemory(
      key: string,
      content: string,
      type?: string,
      metadata?: Record<string, unknown>
    ): Promise<{ success: true }> {
      const step = stepLogger.log("memory_write", "writeMemory", {
        key,
        type,
      });
      try {
        await upsertAgentMemory(ctx.db, {
          agentId: ctx.agentId,
          teamId: ctx.teamId,
          key,
          content,
          type,
          metadata,
        });
        step.done({ upserted: true });
        return { success: true };
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Memory write failed";
        step.done({ error: msg });
        throw error;
      }
    },

    getTrigger(): Record<string, unknown> {
      const step = stepLogger.log("context", "getTrigger", {});
      const triggerData = ctx.triggerContext ?? {};
      step.done(triggerData);
      return triggerData;
    },

    async notify(
      message: string,
      priority: "low" | "normal" | "urgent" = "normal"
    ): Promise<{ success: true }> {
      const step = stepLogger.log("notification", "notify", {
        priority,
        messageLength: message.length,
      });
      try {
        await updateComputerRun(ctx.db, ctx.runId, { summary: message });
        if (ctx.onNotify) {
          await ctx.onNotify(ctx.teamId, "computer.agent_alert", {
            runId: ctx.runId,
            agentName: ctx.agentName,
            summary: message,
            priority,
            sendEmail: priority === "urgent",
          });
        }
        step.done({ delivered: true });
        return { success: true };
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Notification failed";
        step.done({ error: msg });
        throw error;
      }
    },

    async propose(actions: ProposedAction[]): Promise<never> {
      const step = stepLogger.log("proposal", "propose", {
        actionCount: actions.length,
      });
      await updateComputerRun(ctx.db, ctx.runId, {
        proposedActions: actions,
        status: "WAITING_APPROVAL",
      });
      if (ctx.onNotify) {
        await ctx.onNotify(ctx.teamId, "computer.proposal_pending", {
          runId: ctx.runId,
          agentName: ctx.agentName,
          agentSlug: ctx.agentSlug,
          actionCount: actions.length,
          summary: `${ctx.agentName} has ${actions.length} proposed action(s) awaiting approval`,
        });
      }
      step.done({ submitted: true, actionCount: actions.length });
      throw new ProposalSubmittedError(actions.length);
    },

    async callConnector(
      toolName: string,
      args: Record<string, unknown>
    ): Promise<unknown> {
      if (toolCallCount >= AGENT_LIMITS.maxToolCalls) {
        throw new Error(
          `Tool call limit exceeded (max ${AGENT_LIMITS.maxToolCalls})`
        );
      }
      toolCallCount += 1;
      const step = stepLogger.log("connector_call", toolName, args);
      try {
        const result = await ctx.mcpClient.callTool({
          name: toolName,
          arguments: args,
        });
        step.done(result);
        return result;
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Connector call failed";
        step.done({ error: msg });
        throw error;
      }
    },

    async searchContext(
      query: string,
      opts?: { scope?: string; limit?: number }
    ): Promise<unknown[]> {
      const step = stepLogger.log("context", "searchContext", {
        query,
        ...opts,
      });
      try {
        const result = await ctx.mcpClient.callTool({
          name: "context_search",
          arguments: { query, ...opts },
        });
        const parsed = bindings.parseMcp(result);
        const data = (parsed as { data?: unknown[] })?.data ?? [];
        step.done({ count: data.length });
        return data;
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Context search failed";
        step.done({ error: msg });
        throw error;
      }
    },
  };

  return {
    bindings,
    steps,
    getCounters: () => ({ toolCallCount, llmCallCount }),
  };
}
