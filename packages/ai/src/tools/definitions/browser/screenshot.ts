import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { requireSession } from "./session";
import { clampTimeout } from "./validation";

const IMAGE_FORMATS = ["png", "jpeg"] as const;

export const browserScreenshotTool = defineTool({
  name: "browser_screenshot",
  description: `Capture a screenshot of the current browser page or a specific element.

USE THIS WHEN:
- You need to visually inspect a web page
- You need to capture the current state of a page for analysis
- You need a screenshot of a specific element (form, chart, header, etc.)

REQUIRES: An active browser session with a loaded page.

RETURNS: Base64-encoded image data with dimensions.`,
  category: "browser",
  deferLoading: true,
  searchKeywords: ["screenshot", "capture", "image", "photo", "screen"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    fullPage: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Capture the full scrollable page instead of just the visible viewport."
      ),
    selector: z
      .string()
      .optional()
      .describe(
        "CSS selector to capture a specific element. Mutually exclusive with fullPage."
      ),
    format: z
      .enum(IMAGE_FORMATS)
      .optional()
      .default("png")
      .describe("Image format: 'png' (lossless) or 'jpeg' (smaller)."),
    timeoutMs: z
      .number()
      .min(1000)
      .max(30_000)
      .optional()
      .default(10_000)
      .describe("Timeout for element visibility if selector is provided."),
  }),

  async execute(params) {
    const session = requireSession();
    const page = session.page;

    if (params.fullPage && params.selector) {
      return failure(
        "INVALID_INPUT",
        "fullPage and selector are mutually exclusive"
      );
    }

    const format = params.format ?? "png";
    const timeout = clampTimeout(params.timeoutMs, 10_000);

    let buffer: Buffer;
    let width: number;
    let height: number;

    if (params.selector) {
      const locator = page.locator(params.selector).first();
      try {
        await locator.waitFor({ state: "visible", timeout });
      } catch {
        return failure(
          "NOT_FOUND",
          `Element not found or not visible: ${params.selector}`,
          { retryable: false }
        );
      }

      const box = await locator.boundingBox();
      if (!box) {
        return failure(
          "NOT_FOUND",
          `Could not get bounding box for: ${params.selector}`
        );
      }

      buffer = await locator.screenshot({ type: format });
      width = Math.round(box.width);
      height = Math.round(box.height);
    } else {
      buffer = await page.screenshot({
        type: format,
        fullPage: params.fullPage,
      });

      const viewport = page.viewportSize();
      if (params.fullPage) {
        const dims = await page.evaluate(
          "({width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight})"
        );
        const parsed = dims as { width: number; height: number };
        width = parsed.width;
        height = parsed.height;
      } else {
        width = viewport?.width ?? 1280;
        height = viewport?.height ?? 720;
      }
    }

    const base64 = buffer.toString("base64");

    return success({
      image: base64,
      format,
      width,
      height,
      sizeBytes: buffer.length,
      url: page.url(),
    });
  },
});
