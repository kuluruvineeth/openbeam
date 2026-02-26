import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

const BROWSER_ENGINE_TIMEOUT_MS = 2.5 * 60 * 1000;

function getEngineCpuUrl(): string {
  return process.env.ENGINE_CPU_URL ?? "http://localhost:8000";
}

const BrowserActionResponseSchema = z.object({
  step: z.number(),
  action: z.string(),
  details: z.string(),
});

const BrowserTaskResponseSchema = z.object({
  status: z.string(),
  extracted_content: z.string().default(""),
  actions: z.array(BrowserActionResponseSchema).default([]),
  screenshots: z.array(z.string()).default([]),
  final_url: z.string().nullable().default(null),
  error: z.string().nullable().default(null),
});

export const browserAutonomousTaskTool = defineTool({
  name: "browser_autonomous_task",
  description: `Execute a complex browser task autonomously using an AI agent.

USE THIS WHEN:
- You need to complete multi-step web interactions (login, fill forms, navigate menus)
- Manual step-by-step browser control would be tedious or complex
- The task requires visual understanding and adaptive decision-making

DO NOT USE WHEN:
- A single navigation + scrape suffices (use browser_navigate + browser_scrape)
- You need precise control over each browser action (use individual browser tools)

The autonomous agent runs locally on the engine service using headless Chromium.
It interprets the task description, navigates pages, and returns extracted content.`,
  category: "browser",
  deferLoading: true,
  searchKeywords: [
    "browser",
    "autonomous",
    "agent",
    "ai",
    "web",
    "automate",
    "task",
  ],
  stakes: "high",
  reversibility: "hard",

  parameters: z.object({
    task: z
      .string()
      .min(1)
      .max(5000)
      .describe("Natural language description of the browser task to perform."),
    startUrl: z
      .string()
      .url()
      .optional()
      .describe("URL to navigate to before starting the task."),
    maxSteps: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(25)
      .describe("Maximum number of browser actions the agent can take."),
  }),

  async execute(params) {
    const url = `${getEngineCpuUrl()}/v1/browser/task`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: params.task,
          start_url: params.startUrl ?? null,
          max_steps: params.maxSteps,
        }),
        signal: AbortSignal.timeout(BROWSER_ENGINE_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        return failure(
          "TIMEOUT",
          `Browser task exceeded ${BROWSER_ENGINE_TIMEOUT_MS / 1000}s timeout`,
          {
            retryable: false,
          }
        );
      }
      return failure(
        "PROVIDER_ERROR",
        `Failed to connect to engine: ${error instanceof Error ? error.message : String(error)}`,
        {
          retryable: true,
          suggestion: `Ensure engine is running at ${getEngineCpuUrl()} with CPU_ENABLE_BROWSER=true`,
        }
      );
    }

    if (response.status === 503) {
      return failure(
        "PROVIDER_ERROR",
        "Browser service is not enabled on the engine",
        {
          retryable: false,
          suggestion:
            "Start the engine with CPU_ENABLE_BROWSER=true and install browser deps",
        }
      );
    }

    if (!response.ok) {
      const body = await response.text();
      return failure(
        "PROVIDER_ERROR",
        `Engine returned ${response.status}: ${body}`,
        { retryable: response.status >= 500 }
      );
    }

    const parsed = BrowserTaskResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      return failure("PROVIDER_ERROR", "Invalid response from browser engine", {
        retryable: false,
      });
    }
    const result = parsed.data;

    if (result.status === "failed" || result.status === "timeout") {
      return failure(
        result.status === "timeout" ? "TIMEOUT" : "PROVIDER_ERROR",
        result.error ?? "Browser task failed",
        { retryable: false }
      );
    }

    return success({
      status: result.status,
      extractedContent: result.extracted_content,
      actionCount: result.actions.length,
      actions: result.actions.map((a) => ({
        step: a.step,
        action: a.action,
        details: a.details,
      })),
      finalUrl: result.final_url,
      screenshotCount: result.screenshots.length,
    });
  },
});
