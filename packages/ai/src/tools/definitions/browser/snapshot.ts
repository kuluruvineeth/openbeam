import type { ElementHandle } from "playwright-core";
import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { requireSession } from "./session";
import { clampTimeout } from "./validation";

const ROLE_EXTRACT_PATTERN = /\[(\w+)\]/;

const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "textbox",
  "checkbox",
  "radio",
  "combobox",
  "listbox",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "searchbox",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "treeitem",
]);

interface AXNode {
  role: string;
  name: string;
  value?: string;
  description?: string;
  children?: AXNode[];
  focused?: boolean;
  checked?: boolean | "mixed";
  disabled?: boolean;
  expanded?: boolean;
  selected?: boolean;
  required?: boolean;
  level?: number;
}

function formatNodeLine(
  node: AXNode,
  depth: number,
  interactiveOnly: boolean
): string | null {
  const role = node.role.toLowerCase();
  const isInteractive = INTERACTIVE_ROLES.has(role);

  if (interactiveOnly && !isInteractive && !hasInteractiveDescendant(node)) {
    return null;
  }

  const indent = "  ".repeat(depth);
  const parts: string[] = [`${indent}[${role}]`];

  if (node.name) {
    parts.push(`"${node.name}"`);
  }

  if (node.value) {
    parts.push(`value="${node.value}"`);
  }

  if (node.checked !== undefined) {
    parts.push(`checked=${String(node.checked)}`);
  }

  if (node.disabled) {
    parts.push("disabled");
  }

  if (node.expanded !== undefined) {
    parts.push(`expanded=${String(node.expanded)}`);
  }

  if (node.selected) {
    parts.push("selected");
  }

  if (node.required) {
    parts.push("required");
  }

  if (node.focused) {
    parts.push("focused");
  }

  return parts.join(" ");
}

function hasInteractiveDescendant(node: AXNode): boolean {
  if (!node.children) {
    return false;
  }
  for (const child of node.children) {
    if (INTERACTIVE_ROLES.has(child.role.toLowerCase())) {
      return true;
    }
    if (hasInteractiveDescendant(child)) {
      return true;
    }
  }
  return false;
}

interface AriaTreeOptions {
  maxDepth: number;
  interactiveOnly: boolean;
  lines: string[];
}

function buildAriaTree(
  node: AXNode,
  depth: number,
  opts: AriaTreeOptions
): void {
  if (depth > opts.maxDepth) {
    return;
  }

  const line = formatNodeLine(node, depth, opts.interactiveOnly);
  if (line !== null) {
    opts.lines.push(line);
  }

  if (node.children) {
    for (const child of node.children) {
      buildAriaTree(child, depth + 1, opts);
    }
  }
}

async function getAccessibilityTree(
  rootHandle: ElementHandle | null,
  page: {
    accessibility: {
      snapshot: (opts?: {
        root?: ElementHandle;
        interestingOnly?: boolean;
      }) => Promise<AXNode | null>;
    };
  }
): Promise<AXNode | null> {
  const options = rootHandle
    ? { root: rootHandle, interestingOnly: false }
    : { interestingOnly: false };

  return await page.accessibility.snapshot(options);
}

export const browserSnapshotTool = defineTool({
  name: "browser_snapshot",
  description: `Get the ARIA accessibility tree of the current page.

USE THIS WHEN:
- You need to understand the page structure without vision/screenshots
- You need to find interactive elements (buttons, links, inputs) to interact with
- You need a text representation of the page for analysis
- You want to understand what content is on the page

The ARIA tree is the PRIMARY way AI agents understand page content. It provides:
- Element roles (button, link, textbox, heading, etc.)
- Element names and labels
- Element states (checked, disabled, expanded, etc.)
- Element values (input content, selected options)
- Hierarchical structure

REQUIRES: An active browser session with a loaded page.

RETURNS: Formatted ARIA tree as structured text.`,
  category: "browser",
  deferLoading: true,
  searchKeywords: [
    "snapshot",
    "aria",
    "accessibility",
    "tree",
    "dom",
    "structure",
    "inspect",
  ],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    selector: z
      .string()
      .optional()
      .describe(
        "CSS selector to snapshot a specific subtree instead of the full page."
      ),
    interactiveOnly: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Only include interactive elements (buttons, links, inputs) and their ancestors."
      ),
    maxDepth: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .default(20)
      .describe("Maximum depth of the accessibility tree to traverse."),
    timeoutMs: z
      .number()
      .min(1000)
      .max(30_000)
      .optional()
      .default(10_000)
      .describe("Timeout for element lookup if selector is provided."),
  }),

  async execute(params) {
    const session = requireSession();
    const page = session.page;
    const timeout = clampTimeout(params.timeoutMs, 10_000);

    let rootHandle: ElementHandle | null = null;

    if (params.selector) {
      const locator = page.locator(params.selector).first();
      try {
        await locator.waitFor({ state: "attached", timeout });
        rootHandle = await locator.elementHandle();
      } catch {
        return failure("NOT_FOUND", `Element not found: ${params.selector}`, {
          retryable: false,
        });
      }

      if (!rootHandle) {
        return failure(
          "NOT_FOUND",
          `Could not get element handle for: ${params.selector}`
        );
      }
    }

    const tree = await getAccessibilityTree(
      rootHandle,
      page as unknown as Parameters<typeof getAccessibilityTree>[1]
    );

    if (!tree) {
      return success({
        snapshot: "(empty page - no accessibility tree available)",
        url: page.url(),
        title: await page.title().catch(() => ""),
        nodeCount: 0,
        interactiveCount: 0,
      });
    }

    const lines: string[] = [];
    buildAriaTree(tree, 0, {
      maxDepth: params.maxDepth ?? 20,
      interactiveOnly: params.interactiveOnly ?? false,
      lines,
    });

    const snapshot = lines.join("\n");
    const interactiveCount = lines.filter((line) => {
      const match = ROLE_EXTRACT_PATTERN.exec(line);
      const role = match?.[1];
      return role ? INTERACTIVE_ROLES.has(role) : false;
    }).length;

    return success({
      snapshot,
      url: page.url(),
      title: await page.title().catch(() => ""),
      nodeCount: lines.length,
      interactiveCount,
    });
  },
});
