import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { requireSession } from "./session";
import { clampTimeout } from "./validation";

const fieldSchema = z.object({
  name: z.string().describe("Name for this field in the output."),
  selector: z.string().describe("CSS selector relative to the row."),
  attribute: z
    .string()
    .optional()
    .describe(
      "HTML attribute to extract (e.g., 'href', 'src'). If omitted, extracts textContent."
    ),
});

export const browserScrapeTool = defineTool({
  name: "browser_scrape",
  description: `Extract structured data from the page by selecting repeating elements and extracting fields from each.

USE THIS WHEN:
- You need to extract a table of data from a page
- You need to scrape a list of items with multiple properties each
- You need structured data from repeating page elements (cards, rows, list items)

Example: scrape a product listing by selecting each product card, then extracting name, price, and link from each card.

REQUIRES: An active browser session with a loaded page.

RETURNS: Array of extracted records, one per matched row element.`,
  category: "browser",
  deferLoading: true,
  searchKeywords: ["scrape", "extract", "data", "table", "list", "structured"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    selector: z
      .string()
      .min(1)
      .describe(
        "CSS selector for repeating row/item elements (e.g., 'table tbody tr', '.product-card')."
      ),
    fields: z
      .array(fieldSchema)
      .min(1)
      .describe(
        "Fields to extract from each matched element. Each field has a name, a CSS selector (relative to the row), and an optional attribute."
      ),
    limit: z
      .number()
      .min(1)
      .max(500)
      .optional()
      .default(100)
      .describe("Maximum number of rows to extract."),
    timeoutMs: z
      .number()
      .min(1000)
      .max(30_000)
      .optional()
      .default(10_000)
      .describe("Timeout for waiting for elements."),
  }),

  async execute(params) {
    const session = requireSession();
    const page = session.page;
    const timeout = clampTimeout(params.timeoutMs, 10_000);

    try {
      await page
        .locator(params.selector)
        .first()
        .waitFor({ state: "attached", timeout });
    } catch {
      return failure(
        "NOT_FOUND",
        `No elements found matching: ${params.selector}`,
        { retryable: false }
      );
    }

    const fieldDefs = params.fields.map((f) => ({
      name: f.name,
      selector: f.selector,
      attribute: f.attribute,
    }));

    const extractionScript = `
      (function(args) {
        var rows = document.querySelectorAll(args.rowSelector);
        var results = [];
        var count = Math.min(rows.length, args.maxRows);
        for (var i = 0; i < count; i++) {
          var row = rows[i];
          var record = {};
          for (var j = 0; j < args.fields.length; j++) {
            var field = args.fields[j];
            var el = row.querySelector(field.selector);
            if (!el) {
              record[field.name] = null;
            } else if (field.attribute) {
              record[field.name] = el.getAttribute(field.attribute);
            } else {
              record[field.name] = (el.textContent || '').trim() || null;
            }
          }
          results.push(record);
        }
        return results;
      })
    `;

    const records = (await page.evaluate(extractionScript as string, {
      rowSelector: params.selector,
      fields: fieldDefs,
      maxRows: params.limit ?? 100,
    })) as Record<string, string | null>[];

    return success({
      records,
      count: records.length,
      url: page.url(),
    });
  },
});
