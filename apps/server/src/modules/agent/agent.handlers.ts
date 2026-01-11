import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type { AgentEvent, AgentExecuteBody } from "./agent.schema";
import { agentExecuteBodySchema } from "./agent.schema";

function createEvent(
  type: AgentEvent["type"],
  data: Record<string, unknown>
): AgentEvent {
  return {
    type,
    timestamp: Date.now(),
    data,
  } as AgentEvent;
}

export async function streamAgentHandler(c: Context<AuthEnv>) {
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required", code: "UNAUTHORIZED" }, 401);
  }

  let body: AgentExecuteBody;
  try {
    const rawBody = await c.req.json();
    body = agentExecuteBodySchema.parse(rawBody);
  } catch {
    return c.json(
      { error: "Invalid request body", code: "INVALID_INPUT" },
      400
    );
  }

  const { prompt, agentType, maxSteps } = body;

  return streamSSE(c, async (stream) => {
    const startTime = Date.now();
    let toolCallCount = 0;

    try {
      await stream.writeSSE({
        data: JSON.stringify(
          createEvent("thinking", { message: "Analyzing query..." })
        ),
      });

      await stream.writeSSE({
        data: JSON.stringify(
          createEvent("status", {
            message: `Starting ${agentType} agent`,
            step: 1,
            totalSteps: maxSteps,
          })
        ),
      });

      const mockToolCall = {
        id: `tool_${Date.now()}`,
        name: "search_hybrid",
        arguments: { query: prompt, limit: 10 },
      };

      await stream.writeSSE({
        data: JSON.stringify(createEvent("tool_call", mockToolCall)),
      });
      toolCallCount += 1;

      await new Promise((resolve) => setTimeout(resolve, 100));

      await stream.writeSSE({
        data: JSON.stringify(
          createEvent("tool_result", {
            id: mockToolCall.id,
            success: true,
            result: { count: 5, items: [] },
            latencyMs: 85,
          })
        ),
      });

      await stream.writeSSE({
        data: JSON.stringify(
          createEvent("text", {
            content:
              "Based on the search results, I found relevant information...",
            isPartial: false,
          })
        ),
      });

      const totalDurationMs = Date.now() - startTime;

      await stream.writeSSE({
        data: JSON.stringify(
          createEvent("complete", {
            success: true,
            output: {
              answer: "This is a sample response from the agent.",
              confidence: 0.92,
            },
            citations: [],
            metrics: {
              totalDurationMs,
              toolCalls: toolCallCount,
              inputTokens: 150,
              outputTokens: 200,
            },
          })
        ),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await stream.writeSSE({
        data: JSON.stringify(
          createEvent("error", {
            code: "AGENT_ERROR",
            message: errorMessage,
            retryable: true,
          })
        ),
      });
    }
  });
}

export async function executeAgentHandler(c: Context<AuthEnv>) {
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required", code: "UNAUTHORIZED" }, 401);
  }

  try {
    const rawBody = await c.req.json();
    agentExecuteBodySchema.parse(rawBody);
  } catch {
    return c.json(
      { error: "Invalid request body", code: "INVALID_INPUT" },
      400
    );
  }

  const startTime = Date.now();

  const result = {
    success: true,
    output: {
      answer: "This is a non-streaming response from the agent.",
      confidence: 0.88,
    },
    citations: [],
    metrics: {
      totalDurationMs: Date.now() - startTime,
      toolCalls: 1,
      inputTokens: 100,
      outputTokens: 150,
    },
  };

  return c.json(result, 200);
}
