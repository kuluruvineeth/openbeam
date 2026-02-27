import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { requireSession } from "./session";
import { clampTimeout } from "./validation";

function resolveLocator(
  page: Awaited<ReturnType<typeof requireSession>>["page"],
  params: { selector?: string; text?: string; index?: number }
) {
  if (params.selector) {
    const locator = page.locator(params.selector);
    return typeof params.index === "number"
      ? locator.nth(params.index)
      : locator.first();
  }

  if (params.text) {
    const locator = page.getByText(params.text, { exact: false });
    return typeof params.index === "number"
      ? locator.nth(params.index)
      : locator.first();
  }

  throw new Error("Either selector or text is required to locate an element");
}

export const browserClickTool = defineTool({
  name: "browser_click",
  description: `Click an element on the page.

USE THIS WHEN:
- You need to click a button, link, or other clickable element
- You need to trigger an action by clicking

Find elements via browser_snapshot (ARIA tree) first, then target them by selector or visible text.

REQUIRES: An active browser session with a loaded page.

RETURNS: Success status and any navigation that occurred.`,
  category: "browser",
  deferLoading: true,
  searchKeywords: ["click", "press", "tap", "button", "element"],
  stakes: "medium",
  reversibility: "hard",

  parameters: z.object({
    selector: z
      .string()
      .optional()
      .describe("CSS or XPath selector for the element to click."),
    text: z
      .string()
      .optional()
      .describe("Click element by its visible text content."),
    index: z
      .number()
      .min(0)
      .optional()
      .describe(
        "Zero-based index if multiple elements match. Default: first match."
      ),
    button: z
      .enum(["left", "right", "middle"])
      .optional()
      .default("left")
      .describe("Mouse button to use."),
    doubleClick: z
      .boolean()
      .optional()
      .default(false)
      .describe("Perform a double-click instead of a single click."),
    timeoutMs: z
      .number()
      .min(1000)
      .max(30_000)
      .optional()
      .default(10_000)
      .describe("Timeout waiting for the element to be actionable."),
  }),

  async execute(params) {
    const session = requireSession();
    const page = session.page;
    const timeout = clampTimeout(params.timeoutMs, 10_000);

    if (!(params.selector || params.text)) {
      return failure(
        "INVALID_INPUT",
        "Either 'selector' or 'text' is required"
      );
    }

    const locator = resolveLocator(page, params);
    const urlBefore = page.url();

    try {
      if (params.doubleClick) {
        await locator.dblclick({
          timeout,
          button: params.button ?? "left",
        });
      } else {
        await locator.click({
          timeout,
          button: params.button ?? "left",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Timeout")) {
        return failure(
          "TIMEOUT",
          `Element not actionable within ${timeout}ms`,
          { retryable: true }
        );
      }
      return failure("NOT_FOUND", `Click failed: ${message}`, {
        retryable: false,
        suggestion:
          "Use browser_snapshot to find available elements and their selectors.",
      });
    }

    await page
      .waitForLoadState("domcontentloaded", { timeout: 5000 })
      .catch(Function.prototype as () => void);

    const urlAfter = page.url();
    const navigated = urlBefore !== urlAfter;

    return success({
      clicked: true,
      navigated,
      url: urlAfter,
      title: await page.title().catch(() => ""),
    });
  },
});

export const browserTypeTool = defineTool({
  name: "browser_type",
  description: `Type text into an input field on the page.

USE THIS WHEN:
- You need to fill in a form field
- You need to type into a search box
- You need to enter text in any input element

Find input elements via browser_snapshot first.

REQUIRES: An active browser session with a loaded page.

RETURNS: Success status.`,
  category: "browser",
  deferLoading: true,
  searchKeywords: ["type", "input", "fill", "text", "form", "enter"],
  stakes: "medium",
  reversibility: "easy",

  parameters: z.object({
    selector: z.string().min(1).describe("CSS selector for the input element."),
    text: z.string().describe("The text to type into the element."),
    clear: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        "Clear the input before typing. Default: true (uses fill). Set false for incremental typing."
      ),
    pressEnter: z
      .boolean()
      .optional()
      .default(false)
      .describe("Press Enter after typing (e.g., to submit a search)."),
    timeoutMs: z
      .number()
      .min(1000)
      .max(30_000)
      .optional()
      .default(10_000)
      .describe("Timeout waiting for the input to be actionable."),
  }),

  async execute(params) {
    const session = requireSession();
    const page = session.page;
    const timeout = clampTimeout(params.timeoutMs, 10_000);

    const locator = page.locator(params.selector).first();

    try {
      await locator.waitFor({ state: "visible", timeout });

      if (params.clear) {
        await locator.fill(params.text, { timeout });
      } else {
        await locator.click({ timeout });
        await locator.pressSequentially(params.text, { delay: 50 });
      }

      if (params.pressEnter) {
        await locator.press("Enter", { timeout });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Timeout")) {
        return failure("TIMEOUT", `Input not actionable within ${timeout}ms`, {
          retryable: true,
        });
      }
      return failure("NOT_FOUND", `Type failed: ${message}`, {
        retryable: false,
        suggestion:
          "Use browser_snapshot to find input elements and their selectors.",
      });
    }

    return success({
      typed: true,
      selector: params.selector,
      textLength: params.text.length,
    });
  },
});

export const browserSelectTool = defineTool({
  name: "browser_select",
  description: `Select an option from a <select> dropdown element.

USE THIS WHEN:
- You need to choose a value from a dropdown/select menu

REQUIRES: An active browser session with a loaded page.

RETURNS: Selected values.`,
  category: "browser",
  deferLoading: true,
  searchKeywords: ["select", "dropdown", "option", "choose"],
  stakes: "medium",
  reversibility: "easy",

  parameters: z.object({
    selector: z
      .string()
      .min(1)
      .describe("CSS selector for the <select> element."),
    values: z.array(z.string()).min(1).describe("Values or labels to select."),
    timeoutMs: z
      .number()
      .min(1000)
      .max(30_000)
      .optional()
      .default(10_000)
      .describe("Timeout waiting for the element to be actionable."),
  }),

  async execute(params) {
    const session = requireSession();
    const page = session.page;
    const timeout = clampTimeout(params.timeoutMs, 10_000);

    const locator = page.locator(params.selector).first();

    try {
      const selected = await locator.selectOption(params.values, { timeout });
      return success({
        selected,
        selector: params.selector,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return failure("NOT_FOUND", `Select failed: ${message}`, {
        retryable: false,
      });
    }
  },
});
