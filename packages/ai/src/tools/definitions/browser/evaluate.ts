import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { requireSession } from "./session";
import { clampTimeout } from "./validation";

export const browserEvaluateTool = defineTool({
  name: "browser_evaluate",
  description: `Execute JavaScript in the browser page context.

USE THIS WHEN:
- You need to extract data not available through the ARIA tree
- You need to manipulate the DOM directly
- You need to read browser APIs (window.location, localStorage, etc.)
- You need to run client-side logic

The expression is evaluated in the page context with access to document, window, etc.

REQUIRES: An active browser session with a loaded page.

RETURNS: The serialized return value of the expression.`,
  category: "browser",
  deferLoading: true,
  searchKeywords: ["evaluate", "javascript", "execute", "script", "js", "eval"],
  stakes: "high",
  reversibility: "irreversible",
  approval: "suggest-apply",

  parameters: z.object({
    expression: z
      .string()
      .min(1)
      .describe(
        "JavaScript expression or function body to evaluate. Arrow functions and IIFEs are supported. Example: '() => document.title' or 'document.querySelectorAll(\"a\").length'"
      ),
    timeoutMs: z
      .number()
      .min(1000)
      .max(60_000)
      .optional()
      .default(30_000)
      .describe("Timeout for the evaluation."),
  }),

  async execute(params) {
    const session = requireSession();
    const page = session.page;
    const timeout = clampTimeout(params.timeoutMs);

    let result: unknown;
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Evaluation timed out after ${timeout}ms`)),
          timeout
        )
      );

      result = await Promise.race([
        page.evaluate((expr: string) => {
          // biome-ignore lint/security/noGlobalEval: eval runs in sandboxed browser page context via Playwright
          const candidate = eval(`(${expr})`);
          return typeof candidate === "function" ? candidate() : candidate;
        }, params.expression),
        timeoutPromise,
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("timed out")) {
        return failure("TIMEOUT", "JavaScript evaluation timed out", {
          retryable: true,
        });
      }
      return failure(
        "INVALID_INPUT",
        `JavaScript evaluation error: ${message}`,
        { retryable: false }
      );
    }

    let serialized: unknown;
    try {
      serialized = JSON.parse(JSON.stringify(result));
    } catch {
      serialized = String(result);
    }

    return success({
      result: serialized,
      type: typeof result,
    });
  },
});
