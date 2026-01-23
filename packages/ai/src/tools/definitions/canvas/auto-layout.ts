import type { CanvasOperation } from "@openplane/types/canvas";
import { z } from "zod";
import { defineTool, success } from "../../builder";

export const canvasAutoLayoutTool = defineTool({
  name: "canvas_auto_layout",
  description:
    "Automatically arrange all nodes on the canvas for better readability. Supports top-to-bottom (TB) and left-to-right (LR) layouts.",
  category: "canvas",
  parameters: z.object({
    direction: z
      .enum(["TB", "LR"])
      .optional()
      .describe(
        "Layout direction: TB (top-to-bottom) or LR (left-to-right). Defaults to TB."
      ),
  }),
  stakes: "low",
  reversibility: "easy",
  execute: (params) => {
    const operation: CanvasOperation = {
      type: "layout",
      id: crypto.randomUUID(),
      direction: params.direction,
      timestamp: Date.now(),
    };

    const directionLabel =
      params.direction === "LR" ? "left-to-right" : "top-to-bottom";

    return success({
      operation,
      message: ["Applied", directionLabel, "auto-layout"].join(" "),
    });
  },
});
