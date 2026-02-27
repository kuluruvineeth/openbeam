import type { Browser } from "playwright-core";
import { chromium } from "playwright-core";
import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { closeAllSessions, hasActiveSession, storeSession } from "./session";

const DEFAULT_VIEWPORT = { width: 1280, height: 720 };

export const browserLaunchTool = defineTool({
  name: "browser_launch",
  description: `Launch a headless Chrome browser session for web automation.

USE THIS WHEN:
- You need to interact with a web page (navigate, click, fill forms, scrape)
- You need to take screenshots of web pages
- You need to inspect the ARIA accessibility tree of a page
- You need to evaluate JavaScript in a browser context

LIFECYCLE:
- Only one browser session is active at a time
- Sessions auto-close after 5 minutes of inactivity
- Use browser_close to explicitly end a session

RETURNS: Session ID and viewport dimensions.`,
  category: "browser",
  deferLoading: true,
  searchKeywords: ["browser", "chrome", "launch", "open", "start", "web"],
  stakes: "medium",
  reversibility: "easy",

  parameters: z.object({
    headless: z
      .boolean()
      .optional()
      .default(true)
      .describe("Run in headless mode (no visible window). Default: true."),
    viewport: z
      .object({
        width: z
          .number()
          .min(320)
          .max(3840)
          .optional()
          .default(DEFAULT_VIEWPORT.width)
          .describe("Viewport width in pixels (320-3840)."),
        height: z
          .number()
          .min(200)
          .max(2160)
          .optional()
          .default(DEFAULT_VIEWPORT.height)
          .describe("Viewport height in pixels (200-2160)."),
      })
      .optional()
      .default(DEFAULT_VIEWPORT)
      .describe("Browser viewport dimensions."),
  }),

  async execute(params) {
    if (hasActiveSession()) {
      await closeAllSessions();
    }

    const viewport = {
      width: params.viewport?.width ?? DEFAULT_VIEWPORT.width,
      height: params.viewport?.height ?? DEFAULT_VIEWPORT.height,
    };

    let browser: Browser;
    try {
      browser = await chromium.launch({
        headless: params.headless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-extensions",
          "--disable-background-networking",
          "--disable-default-apps",
          "--disable-sync",
          "--disable-translate",
          "--no-first-run",
        ],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return failure("PROVIDER_ERROR", `Failed to launch browser: ${message}`, {
        retryable: false,
        suggestion:
          "Ensure Chromium is installed. Run: bunx playwright install chromium",
      });
    }

    const context = await browser.newContext({
      viewport,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "en-US",
      timezoneId: "America/Los_Angeles",
    });

    const page = await context.newPage();
    const session = storeSession(browser, context, page);

    return success({
      sessionId: session.id,
      viewport,
      headless: params.headless,
    });
  },
});
