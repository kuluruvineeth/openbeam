import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { requireSession } from "./session";
import {
  checkNavigationRateLimit,
  clampTimeout,
  validateUrl,
} from "./validation";

const WAIT_UNTIL_OPTIONS = ["load", "domcontentloaded", "networkidle"] as const;

export const browserNavigateTool = defineTool({
  name: "browser_navigate",
  description: `Navigate the browser to a URL.

USE THIS WHEN:
- You need to open a specific web page
- You need to navigate from the current page to a new one

REQUIRES: An active browser session (use browser_launch first).

RETURNS: The page title, final URL, and HTTP status code.`,
  category: "browser",
  deferLoading: true,
  searchKeywords: ["navigate", "goto", "url", "open", "page", "browse"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    url: z.string().min(1).describe("The URL to navigate to."),
    waitUntil: z
      .enum(WAIT_UNTIL_OPTIONS)
      .optional()
      .default("load")
      .describe(
        "When to consider navigation complete. 'load' waits for load event, 'domcontentloaded' for DOM ready, 'networkidle' for no network activity."
      ),
    timeoutMs: z
      .number()
      .min(1000)
      .max(120_000)
      .optional()
      .default(30_000)
      .describe("Navigation timeout in milliseconds (1000-120000)."),
  }),

  async execute(params) {
    const session = requireSession();

    const urlResult = validateUrl(params.url);
    if (!urlResult.valid) {
      return failure("INVALID_INPUT", urlResult.reason);
    }

    const rateCheck = checkNavigationRateLimit(session.id);
    if (!rateCheck.allowed) {
      return failure(
        "RATE_LIMITED",
        "Navigation rate limit exceeded (30 per minute)",
        { retryable: true }
      );
    }

    const timeout = clampTimeout(params.timeoutMs);

    let statusCode: number | null = null;
    try {
      const response = await session.page.goto(urlResult.parsed.href, {
        waitUntil: params.waitUntil,
        timeout,
      });
      statusCode = response?.status() ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Timeout")) {
        return failure("TIMEOUT", `Navigation timed out after ${timeout}ms`, {
          retryable: true,
          suggestion:
            "Try with waitUntil: 'domcontentloaded' or increase timeout.",
        });
      }
      return failure("NETWORK_ERROR", `Navigation failed: ${message}`, {
        retryable: true,
      });
    }

    const title = await session.page.title().catch(() => "");
    const finalUrl = session.page.url();

    return success({
      title,
      url: finalUrl,
      statusCode,
      navigationsRemaining: rateCheck.remaining,
    });
  },
});
